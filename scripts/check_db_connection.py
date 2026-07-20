#!/usr/bin/env python3
"""MySQL connection check for the AI_RAG demo database.

This script performs infrastructure checks only:
- connect to the configured MySQL database;
- read database version and current database time;
- verify the five required tables exist;
- verify demo-data row counts meet minimum thresholds.

It does not query business details, write business data, implement CRUD,
implement login or repair workflows, run RAG retrieval, generate embeddings,
or call an LLM.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse


REQUIRED_TABLES = [
    "users",
    "repair_orders",
    "chat_history",
    "repairer_logs",
    "knowledge_chunks",
]

MINIMUM_COUNTS = {
    "users": 3,
    "repair_orders": 5,
    "chat_history": 5,
    "repairer_logs": 5,
    "knowledge_chunks": 8,
}

EXPECTED_COUNT_ENV = {
    "users": "EXPECTED_USERS",
    "repair_orders": "EXPECTED_REPAIR_ORDERS",
    "chat_history": "EXPECTED_CHAT_HISTORY",
    "repairer_logs": "EXPECTED_REPAIRER_LOGS",
    "knowledge_chunks": "EXPECTED_KNOWLEDGE_CHUNKS",
}

DEFAULT_MYSQL_EXE = r"E:\MySQL\MySQL Workbench 8.0\mysql.exe"


@dataclass(frozen=True)
class DbConfig:
    host: str
    port: int
    database: str
    username: str
    password: str
    connect_timeout: int


@dataclass(frozen=True)
class TableCheck:
    table_name: str
    exists: bool
    minimum: int
    actual: int | None
    ok: bool
    message: str


class ConfigError(RuntimeError):
    pass


def mask_value(value: str) -> str:
    return "***" if value else ""


def parse_mysql_url(database_url: str) -> DbConfig:
    parsed = urlparse(database_url)
    if parsed.scheme.lower() not in {"mysql", "mysql+pymysql", "mysql+mysqlconnector"}:
        raise ConfigError("DATABASE_URL must use mysql:// when provided.")

    query = parse_qs(parsed.query)
    timeout_raw = query.get("connect_timeout", query.get("connectTimeout", ["5"]))[0]
    try:
        timeout = int(timeout_raw)
    except ValueError as exc:
        raise ConfigError(f"connect_timeout must be an integer, got {timeout_raw!r}") from exc

    username = unquote(parsed.username or "")
    password = unquote(parsed.password or "")
    host = parsed.hostname or ""
    port = parsed.port or 3306
    database = unquote(parsed.path.lstrip("/"))

    missing = [
        key
        for key, value in {
            "DATABASE_URL.username": username,
            "DATABASE_URL.password": password,
            "DATABASE_URL.host": host,
            "DATABASE_URL.database": database,
        }.items()
        if not value
    ]
    if missing:
        raise ConfigError("Missing database configuration: " + ", ".join(missing))

    return DbConfig(host, port, database, username, password, timeout)


def load_config() -> DbConfig:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        return parse_mysql_url(database_url)

    host = os.getenv("DB_HOST", "localhost").strip()
    port_raw = os.getenv("DB_PORT", "3306").strip()
    database = os.getenv("DB_NAME", "ai_rag").strip()
    username = (
        os.getenv("DB_USERNAME", "").strip()
        or os.getenv("DB_USER", "").strip()
    )
    password = os.getenv("DB_PASSWORD", "")
    timeout_raw = os.getenv("DB_CONNECT_TIMEOUT_SECONDS", "5").strip()

    try:
        port = int(port_raw)
    except ValueError as exc:
        raise ConfigError(f"DB_PORT must be an integer, got {port_raw!r}") from exc
    try:
        timeout = int(timeout_raw)
    except ValueError as exc:
        raise ConfigError(
            f"DB_CONNECT_TIMEOUT_SECONDS must be an integer, got {timeout_raw!r}"
        ) from exc

    missing = [
        key
        for key, value in {
            "DB_HOST": host,
            "DB_PORT": str(port),
            "DB_NAME": database,
            "DB_USERNAME": username,
            "DB_PASSWORD": password,
        }.items()
        if not value
    ]
    if missing:
        raise ConfigError(
            "Missing database configuration. Set DATABASE_URL or provide: "
            + ", ".join(missing)
        )

    return DbConfig(host, port, database, username, password, timeout)


def load_minimum_counts() -> dict[str, int]:
    counts = dict(MINIMUM_COUNTS)
    for table_name, env_name in EXPECTED_COUNT_ENV.items():
        raw = os.getenv(env_name)
        if raw is None or raw == "":
            continue
        try:
            counts[table_name] = int(raw)
        except ValueError as exc:
            raise ConfigError(f"{env_name} must be an integer, got {raw!r}") from exc
    return counts


def config_summary(config: DbConfig) -> dict[str, Any]:
    return {
        "host": config.host,
        "port": config.port,
        "database": config.database,
        "username": config.username,
        "password": mask_value(config.password),
        "connect_timeout": config.connect_timeout,
    }


def find_mysql_cli(explicit_path: str | None) -> str | None:
    if explicit_path:
        return explicit_path if os.path.exists(explicit_path) else None

    from_path = shutil.which("mysql")
    if from_path:
        return from_path

    return DEFAULT_MYSQL_EXE if os.path.exists(DEFAULT_MYSQL_EXE) else None


def mysql_cli_query(config: DbConfig, mysql_exe: str, sql: str) -> list[dict[str, Any]]:
    command = [
        mysql_exe,
        "--batch",
        "--raw",
        "--silent",
        "--skip-column-names",
        f"--host={config.host}",
        f"--port={config.port}",
        f"--user={config.username}",
        f"--password={config.password}",
        f"--connect-timeout={config.connect_timeout}",
        config.database,
        "--execute",
        sql,
    ]
    completed = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if completed.returncode != 0:
        raise RuntimeError(sanitize_cli_error(completed.stderr.strip()))
    return parse_rows(completed.stdout)


def sanitize_cli_error(message: str) -> str:
    if not message:
        return "mysql CLI exited with an error."
    return message.replace("Using a password on the command line interface can be insecure.", "").strip()


def parse_rows(output: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line in output.splitlines():
        line = line.strip()
        if not line:
            continue
        rows.append(json.loads(line))
    return rows


def build_check_sql(config: DbConfig, minimum_counts: dict[str, int]) -> str:
    table_literals = ", ".join(f"'{table_name}'" for table_name in REQUIRED_TABLES)
    count_selects = []
    for table_name in REQUIRED_TABLES:
        count_selects.append(
            "SELECT "
            f"'{table_name}' AS table_name, "
            f"{minimum_counts[table_name]} AS minimum_count, "
            f"(SELECT COUNT(*) FROM `{table_name}`) AS actual_count"
        )

    return f"""
SELECT JSON_OBJECT(
    'database_version', VERSION(),
    'database_time', DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'),
    'database_name', DATABASE()
) AS row_json;

SELECT JSON_OBJECT(
    'table_name', required.table_name,
    'exists', IF(t.table_name IS NULL, CAST(FALSE AS JSON), CAST(TRUE AS JSON))
) AS row_json
FROM (
    SELECT 'users' AS table_name
    UNION ALL SELECT 'repair_orders'
    UNION ALL SELECT 'chat_history'
    UNION ALL SELECT 'repairer_logs'
    UNION ALL SELECT 'knowledge_chunks'
) AS required
LEFT JOIN information_schema.tables AS t
  ON t.table_schema = '{config.database.replace("'", "''")}'
 AND t.table_name = required.table_name
ORDER BY required.table_name;

SELECT JSON_OBJECT(
    'table_name', counts.table_name,
    'minimum_count', counts.minimum_count,
    'actual_count', counts.actual_count
) AS row_json
FROM (
    {" UNION ALL ".join(count_selects)}
) AS counts
WHERE counts.table_name IN ({table_literals})
ORDER BY counts.table_name;
"""


def load_python_driver() -> tuple[str, Any] | None:
    try:
        import pymysql  # type: ignore

        return "pymysql", pymysql
    except ImportError:
        pass

    try:
        import mysql.connector  # type: ignore

        return "mysql.connector", mysql.connector
    except ImportError:
        return None


def run_with_pymysql(config: DbConfig, driver: Any, minimum_counts: dict[str, int]) -> tuple[dict[str, Any], list[TableCheck]]:
    connection = driver.connect(
        host=config.host,
        port=config.port,
        user=config.username,
        password=config.password,
        database=config.database,
        charset="utf8mb4",
        connect_timeout=config.connect_timeout,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT VERSION(), DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'), DATABASE()")
            version, database_time, database_name = cursor.fetchone()

            checks: list[TableCheck] = []
            for table_name in REQUIRED_TABLES:
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM information_schema.tables
                    WHERE table_schema = %s AND table_name = %s
                    """,
                    (config.database, table_name),
                )
                exists = int(cursor.fetchone()[0]) > 0
                if not exists:
                    checks.append(
                        TableCheck(
                            table_name,
                            False,
                            minimum_counts[table_name],
                            None,
                            False,
                            "missing table",
                        )
                    )
                    continue

                cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
                actual = int(cursor.fetchone()[0])
                minimum = minimum_counts[table_name]
                ok = actual >= minimum
                message = "count meets minimum" if ok else f"count below minimum: expected >= {minimum}, actual {actual}"
                checks.append(TableCheck(table_name, True, minimum, actual, ok, message))

        return {
            "database_version": str(version),
            "database_time": str(database_time),
            "database_name": str(database_name),
        }, checks
    finally:
        connection.close()


def run_with_mysql_connector(config: DbConfig, driver: Any, minimum_counts: dict[str, int]) -> tuple[dict[str, Any], list[TableCheck]]:
    connection = driver.connect(
        host=config.host,
        port=config.port,
        user=config.username,
        password=config.password,
        database=config.database,
        charset="utf8mb4",
        connection_timeout=config.connect_timeout,
    )
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT VERSION(), DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'), DATABASE()")
        version, database_time, database_name = cursor.fetchone()

        checks: list[TableCheck] = []
        for table_name in REQUIRED_TABLES:
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = %s AND table_name = %s
                """,
                (config.database, table_name),
            )
            exists = int(cursor.fetchone()[0]) > 0
            if not exists:
                checks.append(
                    TableCheck(
                        table_name,
                        False,
                        minimum_counts[table_name],
                        None,
                        False,
                        "missing table",
                    )
                )
                continue

            cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
            actual = int(cursor.fetchone()[0])
            minimum = minimum_counts[table_name]
            ok = actual >= minimum
            message = "count meets minimum" if ok else f"count below minimum: expected >= {minimum}, actual {actual}"
            checks.append(TableCheck(table_name, True, minimum, actual, ok, message))

        cursor.close()
        return {
            "database_version": str(version),
            "database_time": str(database_time),
            "database_name": str(database_name),
        }, checks
    finally:
        connection.close()


def run_with_cli(config: DbConfig, mysql_exe: str, minimum_counts: dict[str, int]) -> tuple[dict[str, Any], list[TableCheck]]:
    metadata_sql = "SELECT JSON_OBJECT('database_version', VERSION(), 'database_time', DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'), 'database_name', DATABASE()) AS row_json;"
    metadata_rows = mysql_cli_query(config, mysql_exe, metadata_sql)
    if not metadata_rows:
        raise RuntimeError("mysql CLI returned no database metadata.")
    metadata = metadata_rows[0]

    table_sql = """
SELECT JSON_OBJECT(
    'table_name', required.table_name,
    'exists', IF(t.table_name IS NULL, FALSE, TRUE)
) AS row_json
FROM (
    SELECT 'users' AS table_name
    UNION ALL SELECT 'repair_orders'
    UNION ALL SELECT 'chat_history'
    UNION ALL SELECT 'repairer_logs'
    UNION ALL SELECT 'knowledge_chunks'
) AS required
LEFT JOIN information_schema.tables AS t
  ON t.table_schema = DATABASE()
 AND t.table_name = required.table_name
ORDER BY required.table_name;
"""
    table_rows = mysql_cli_query(config, mysql_exe, table_sql)
    exists_by_table = {row["table_name"]: bool(row["exists"]) for row in table_rows}

    checks: list[TableCheck] = []
    for table_name in REQUIRED_TABLES:
        exists = exists_by_table.get(table_name, False)
        minimum = minimum_counts[table_name]
        if not exists:
            checks.append(TableCheck(table_name, False, minimum, None, False, "missing table"))
            continue

        count_sql = f"SELECT JSON_OBJECT('actual_count', COUNT(*)) AS row_json FROM `{table_name}`;"
        count_rows = mysql_cli_query(config, mysql_exe, count_sql)
        actual = int(count_rows[0]["actual_count"]) if count_rows else 0
        ok = actual >= minimum
        message = "count meets minimum" if ok else f"count below minimum: expected >= {minimum}, actual {actual}"
        checks.append(TableCheck(table_name, True, minimum, actual, ok, message))

    return metadata, checks


def print_results(driver_name: str, config: DbConfig, metadata: dict[str, Any], checks: list[TableCheck]) -> int:
    failures = [check for check in checks if not check.ok]

    print("Database connection check")
    print(f"Driver: {driver_name}")
    print(f"Config: {json.dumps(config_summary(config), ensure_ascii=False)}")
    print(f"Database: {metadata.get('database_name', config.database)}")
    print(f"Database version: {metadata.get('database_version', 'unknown')}")
    print(f"Database time: {metadata.get('database_time', 'unknown')}")

    for check in checks:
        marker = "OK" if check.ok else "FAIL"
        actual = "n/a" if check.actual is None else str(check.actual)
        print(
            f"[{marker}] {check.table_name}: "
            f"exists={check.exists}, minimum={check.minimum}, actual={actual}, {check.message}"
        )

    if failures:
        print("Result: failed")
        return 1

    print("Result: success")
    return 0


def run_check(mysql_exe: str | None) -> int:
    config = load_config()
    minimum_counts = load_minimum_counts()

    loaded_driver = load_python_driver()
    if loaded_driver:
        driver_name, driver = loaded_driver
        if driver_name == "pymysql":
            metadata, checks = run_with_pymysql(config, driver, minimum_counts)
        else:
            metadata, checks = run_with_mysql_connector(config, driver, minimum_counts)
        return print_results(driver_name, config, metadata, checks)

    mysql_cli = find_mysql_cli(mysql_exe)
    if not mysql_cli:
        raise ConfigError(
            "No Python MySQL driver is installed and mysql CLI was not found. "
            "Install PyMySQL/mysql-connector-python after approval, add mysql to PATH, "
            f"or pass --mysql-exe \"{DEFAULT_MYSQL_EXE}\"."
        )

    metadata, checks = run_with_cli(config, mysql_cli, minimum_counts)
    return print_results(f"mysql CLI ({mysql_cli})", config, metadata, checks)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check AI_RAG MySQL connectivity, required tables, and demo-data minimum counts."
    )
    parser.add_argument(
        "--mysql-exe",
        help="Path to mysql.exe. Used only when Python MySQL drivers are unavailable.",
    )
    args = parser.parse_args()

    try:
        return run_check(args.mysql_exe)
    except ConfigError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:  # noqa: BLE001 - CLI should show a clear sanitized failure.
        print(f"Database connection check failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
