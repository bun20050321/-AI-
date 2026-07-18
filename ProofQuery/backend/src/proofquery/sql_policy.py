from collections.abc import Iterable

from sqlglot import exp, parse
from sqlglot.errors import ParseError

from proofquery.errors import AppError


def _expression_types(names: Iterable[str]) -> tuple[type[exp.Expression], ...]:
    return tuple(
        expression_type
        for name in names
        if isinstance((expression_type := getattr(exp, name, None)), type)
    )


BANNED_EXPRESSIONS = _expression_types(
    (
        "Alter",
        "Attach",
        "Command",
        "Commit",
        "Copy",
        "Create",
        "Delete",
        "Detach",
        "Drop",
        "Insert",
        "LoadData",
        "Merge",
        "Pragma",
        "Rollback",
        "Set",
        "Transaction",
        "TruncateTable",
        "Update",
        "Use",
    )
)


def _unsafe() -> AppError:
    return AppError(
        "SQL_UNSAFE",
        "Only one read-only query against the current dataset is allowed.",
    )


def validate_sql(sql: str) -> str:
    try:
        statements = [
            statement
            for statement in parse(sql, read="duckdb")
            if statement is not None
        ]
    except ParseError as error:
        raise AppError("SQL_INVALID", "The query could not be parsed.") from error

    if len(statements) != 1:
        raise _unsafe()
    statement = statements[0]
    if not isinstance(statement, exp.Select):
        raise _unsafe()
    if BANNED_EXPRESSIONS and any(
        isinstance(node, BANNED_EXPRESSIONS) for node in statement.walk()
    ):
        raise _unsafe()

    cte_names = {
        cte.alias_or_name.lower()
        for cte in statement.find_all(exp.CTE)
        if cte.alias_or_name
    }
    for table in statement.find_all(exp.Table):
        if not isinstance(table.this, exp.Identifier):
            raise _unsafe()
        if table.args.get("db") is not None or table.args.get("catalog") is not None:
            raise _unsafe()
        if table.name.lower() not in {"dataset", *cte_names}:
            raise _unsafe()

    for function in statement.find_all(exp.Func):
        function_name = function.sql_name().lower()
        if (
            function_name.startswith("read_")
            or function_name.endswith("_scan")
            or function_name
            in {
                "glob",
                "query",
                "query_table",
                "current_setting",
                "getvariable",
            }
        ):
            raise _unsafe()

    normalized = statement.sql(dialect="duckdb", pretty=False)
    if not normalized.upper().startswith(("SELECT", "WITH")):
        raise _unsafe()
    return normalized
