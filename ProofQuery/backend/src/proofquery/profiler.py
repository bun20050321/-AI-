import math
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

from proofquery.errors import AppError
from proofquery.models import ColumnProfile, DatasetProfile, JsonValue
from proofquery.sessions import Session


NUMERIC_TYPES = (
    "TINYINT",
    "SMALLINT",
    "INTEGER",
    "BIGINT",
    "HUGEINT",
    "UTINYINT",
    "USMALLINT",
    "UINTEGER",
    "UBIGINT",
    "DECIMAL",
    "FLOAT",
    "DOUBLE",
)
TEMPORAL_TYPES = ("DATE", "TIMESTAMP", "TIME")
TEXT_TYPES = ("VARCHAR", "CHAR", "TEXT")


def quote_identifier(name: str) -> str:
    return f'"{name.replace(chr(34), chr(34) * 2)}"'


def _json_value(value: Any) -> JsonValue:
    if value is None or isinstance(value, (str, int, bool)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (date, datetime, time)):
        return value.isoformat()
    return str(value)


def _sample_value(value: Any) -> JsonValue:
    normalized = _json_value(value)
    if isinstance(normalized, str):
        return normalized[:120]
    return normalized


def _profile_column(session: Session, name: str, physical_type: str) -> ColumnProfile:
    quoted_name = quote_identifier(name)
    null_count, distinct_count, minimum, maximum = session.connection.execute(
        f"""
        select
            count(*) filter (where {quoted_name} is null),
            count(distinct {quoted_name}),
            min({quoted_name}),
            max({quoted_name})
        from dataset
        """
    ).fetchone()
    samples = session.connection.execute(
        f"""
        select {quoted_name}
        from dataset
        where {quoted_name} is not null
        group by {quoted_name}
        order by count(*) desc, cast({quoted_name} as varchar)
        limit 5
        """
    ).fetchall()
    row_count = session.dataset_metadata.row_count
    null_rate = null_count / row_count if row_count else 0.0
    warnings = []
    if null_count:
        warnings.append(f"{null_rate:.0%} 的值缺失")

    return ColumnProfile(
        name=name,
        physical_type=physical_type,
        null_count=null_count,
        null_rate=null_rate,
        distinct_count=distinct_count,
        minimum=_json_value(minimum),
        maximum=_json_value(maximum),
        samples=[_sample_value(row[0]) for row in samples],
        warnings=warnings,
    )


def _suggest_questions(columns: list[ColumnProfile]) -> list[str]:
    numeric = next(
        (column for column in columns if column.physical_type.startswith(NUMERIC_TYPES)),
        None,
    )
    temporal = next(
        (column for column in columns if column.physical_type.startswith(TEMPORAL_TYPES)),
        None,
    )
    categorical = next(
        (
            column
            for column in columns
            if column.physical_type.startswith(TEXT_TYPES)
            and column.distinct_count > 1
            and column.distinct_count < max(10, sum(1 for _ in columns) * 10)
        ),
        None,
    )

    suggestions: list[str] = []
    if categorical and numeric:
        suggestions.append(f"按 {categorical.name} 比较 {numeric.name}")
    if temporal and numeric:
        suggestions.append(f"查看 {temporal.name} 上 {numeric.name} 的变化趋势")
    if any(column.null_count for column in columns):
        suggestions.append("检查缺失值和数据质量")
    if not suggestions and columns:
        suggestions.append(f"总结 {columns[0].name} 的分布")
    return suggestions[:3]


def profile_dataset(session: Session) -> DatasetProfile:
    metadata = session.dataset_metadata
    if metadata is None:
        raise AppError("DATASET_REQUIRED", "Upload a CSV before analyzing it.")

    schema = session.connection.execute("describe dataset").fetchall()
    columns = [
        _profile_column(session, name=row[0], physical_type=row[1]) for row in schema
    ]
    profile = DatasetProfile(
        filename=metadata.filename,
        size_bytes=metadata.size_bytes,
        row_count=metadata.row_count,
        columns=columns,
        warnings=[warning for column in columns for warning in column.warnings],
        suggested_questions=_suggest_questions(columns),
    )
    session.profile = profile
    return profile
