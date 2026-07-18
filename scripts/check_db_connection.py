#!/usr/bin/env python3
"""Database connection check for the AI_RAG database foundation.

This script performs infrastructure checks only:
- connect to the configured database;
- read database version/dialect information;
- verify required foundation tables exist;
- verify sample-data counts when expected values are configured;
- write one operational check record to database_connection_checks.

It does not implement business CRUD, business APIs, RAG retrieval, or LLM calls.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable
from urllib.parse import quote, urlparse, urlunparse


REQUIRED_TABLES = [
    "product_models",
    "product_versions",
    "manual_documents",
    "manual_sections",
    "manual_chunks",
    "chunk_sources",
    "vector_index_manifests",
    "chunk_embedding_metadata",
    "repair_contacts",
    "golden_questions",
    "database_connection_checks",
]

EXPECTED_COUNT_ENV = {
    "product_models": "EXPECTED_PRODUCT_MODELS",
    "product_versions": "EXPECTED_PRODUCT_VERSIONS",
    "manual_documents": "EXPECTED_MANUAL_DOCUMENTS",
    "manual_sections": "EXPECTED_MANUAL_SECTIONS",
    "manual_chunks": "EXPECTED_MANUAL_CHUNKS",
    "chunk_sources": "EXPECTED_CHUNK_SOURCES",
    "vector_index_manifests": "EXPECTED_VECTOR_INDEX_MANIFESTS",
    "chunk_embedding_metadata": "EXPECTED_CHUNK_EMBEDDING_METADATA",
    "repair_contacts": "EXPECTED_REPAIR_CONTACTS",
    "golden_questions": "EXPECTED_GOLDEN_QUESTIONS",
}


@dataclass
class CheckResult:
    table: str
    expected: int | None
    actual: int | None
    ok: bool
    message: str


class ConfigError(RuntimeError):
    pass


def mask_url(value: str) -> str:
    if not value:
        return ""
    parsed = urlparse(value)
    if not parsed.netloc or "@" not in parsed.netloc:
        return value
    userinfo, hostinfo = parsed.netloc.rsplit("@", 1)
    if ":" in userinfo:
        username, _password = userinfo.split(":", 1)
        safe_userinfo = f"{username}:***"
    else:
        safe_userinfo = userinfo
    return urlunparse(parsed._replace(netloc=f"{safe_userinfo}@{hostinfo}"))


def build_database_url() -> str:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        return database_url

    host = os.getenv("DB_HOST", "").strip()
    port = os.getenv("DB_PORT", "5432").strip()
    name = os.getenv("DB_NAME", "").strip()
    user = os.getenv("DB_USER", "").strip()
    password = os.getenv("DB_PASSWORD", "")
    ssl_mode = os.getenv("DB_SSL_MODE", "disable").strip()
    timeout = os.getenv("DB_CONNECT_TIMEOUT_SECONDS", "5").strip()

    missing = [key for key, value in {
        "DB_HOST": host,
        "DB_PORT": port,
        "DB_NAME": name,
        "DB_USER": user,
        "DB_PASSWORD": password,
    }.items() if not value]
    if missing:
        raise ConfigError(
            "Missing database configuration. Set DATABASE_URL or provide: "
            + ", ".join(missing)
        )

    query = f"sslmode={quote(ssl_mode)}&connect_timeout={quote(timeout)}"
    return (
        f"postgresql://{quote(user)}:{quote(password)}@"
        f"{host}:{port}/{quote(name)}?{query}"
    )


def parse_expected_counts() -> dict[str, int]:
    expected: dict[str, int] = {}
    for table, env_name in EXPECTED_COUNT_ENV.items():
        raw = os.getenv(env_name)
        if raw is None or raw == "":
            continue
        try:
            expected[table] = int(raw)
        except ValueError as exc:
            raise ConfigError(f"{env_name} must be an integer, got {raw!r}") from exc
    return expected


def load_postgres_driver() -> tuple[str, Any]:
    try:
        import psycopg  # type: ignore

        return "psycopg", psycopg
    except ImportError:
        pass

    try:
        import psycopg2  # type: ignore

        return "psycopg2", psycopg2
    except ImportError as exc:
        raise ConfigError(
            "PostgreSQL DATABASE_URL requires a Python driver, but neither "
            "'psycopg' nor 'psycopg2' is installed. Install one after approval, "
            "or run this script in an environment that already provides it."
        ) from exc


def connect(database_url: str) -> tuple[str, Any]:
    scheme = urlparse(database_url).scheme.lower()
    if scheme in {"postgres", "postgresql"}:
        driver_name, driver = load_postgres_driver()
        connection = driver.connect(database_url)
        return driver_name, connection

    if scheme == "sqlite":
        import sqlite3

        parsed = urlparse(database_url)
        db_path = parsed.path
        if parsed.netloc:
            db_path = f"//{parsed.netloc}{parsed.path}"
        if not db_path:
            raise ConfigError("sqlite DATABASE_URL must include a database file path.")
        return "sqlite3", sqlite3.connect(db_path)

    raise ConfigError(
        "Unsupported DATABASE_URL scheme. Use postgresql:// or sqlite:/// for local checks."
    )


def fetch_one(cursor: Any, sql: str, params: Iterable[Any] = ()) -> Any:
    cursor.execute(sql, tuple(params))
    return cursor.fetchone()


def table_exists(cursor: Any, dialect: str, table_name: str) -> bool:
    if dialect in {"psycopg", "psycopg2"}:
        row = fetch_one(
            cursor,
            """
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = %s
            LIMIT 1
            """,
            [table_name],
        )
    else:
        row = fetch_one(
            cursor,
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
            [table_name],
        )
    return row is not None


def get_database_version(cursor: Any, dialect: str) -> str:
    if dialect in {"psycopg", "psycopg2"}:
        row = fetch_one(cursor, "SELECT version()")
    else:
        row = fetch_one(cursor, "SELECT sqlite_version()")
    return str(row[0]) if row else "unknown"


def count_rows(cursor: Any, table_name: str) -> int:
    # Table names are checked against REQUIRED_TABLES before this call.
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    row = cursor.fetchone()
    return int(row[0]) if row else 0


def verify_tables_and_counts(
    cursor: Any,
    dialect: str,
    expected_counts: dict[str, int],
) -> tuple[list[str], list[CheckResult]]:
    existing_tables: list[str] = []
    results: list[CheckResult] = []

    for table in REQUIRED_TABLES:
        exists = table_exists(cursor, dialect, table)
        if not exists:
            results.append(CheckResult(table, expected_counts.get(table), None, False, "missing table"))
            continue

        existing_tables.append(table)
        expected = expected_counts.get(table)
        actual = count_rows(cursor, table) if table != "database_connection_checks" else None
        if expected is None or table == "database_connection_checks":
            results.append(CheckResult(table, expected, actual, True, "exists"))
            continue

        ok = actual == expected
        message = "count matches" if ok else f"count mismatch: expected {expected}, actual {actual}"
        results.append(CheckResult(table, expected, actual, ok, message))

    return existing_tables, results


def record_connection_check(
    cursor: Any,
    dialect: str,
    database_type: str,
    database_version: str,
    status: str,
    checked_tables: list[str],
    sample_summary: dict[str, Any],
    error_message: str | None,
) -> str:
    check_id = f"DB-CHECK-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8]}"
    if dialect in {"psycopg", "psycopg2"}:
        cursor.execute(
            """
            INSERT INTO database_connection_checks (
                check_id,
                database_type,
                database_version,
                check_status,
                checked_tables,
                sample_data_summary,
                error_message,
                checked_at,
                created_at
            ) VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            (
                check_id,
                database_type,
                database_version[:64],
                status,
                json.dumps(checked_tables, ensure_ascii=False),
                json.dumps(sample_summary, ensure_ascii=False),
                error_message,
            ),
        )
    else:
        cursor.execute(
            """
            INSERT INTO database_connection_checks (
                check_id,
                database_type,
                database_version,
                check_status,
                checked_tables,
                sample_data_summary,
                error_message,
                checked_at,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            (
                check_id,
                database_type,
                database_version[:64],
                status,
                json.dumps(checked_tables, ensure_ascii=False),
                json.dumps(sample_summary, ensure_ascii=False),
                error_message,
            ),
        )
    return check_id


def run_check(write_record: bool) -> int:
    database_url = build_database_url()
    expected_counts = parse_expected_counts()
    safe_url = mask_url(database_url)
    print(f"Database URL: {safe_url}")

    dialect, connection = connect(database_url)
    try:
        cursor = connection.cursor()
        database_version = get_database_version(cursor, dialect)
        print(f"Driver: {dialect}")
        print(f"Database version: {database_version}")

        existing_tables, results = verify_tables_and_counts(cursor, dialect, expected_counts)
        failures = [result for result in results if not result.ok]

        sample_summary = {
            result.table: result.actual
            for result in results
            if result.actual is not None
        }
        check_status = "success" if not failures else "failed"
        error_message = "; ".join(f"{item.table}: {item.message}" for item in failures) or None

        for result in results:
            marker = "OK" if result.ok else "FAIL"
            expected_text = "not configured" if result.expected is None else str(result.expected)
            actual_text = "n/a" if result.actual is None else str(result.actual)
            print(f"[{marker}] {result.table}: expected={expected_text}, actual={actual_text}, {result.message}")

        if write_record:
            if "database_connection_checks" not in existing_tables:
                print("[FAIL] Cannot record check because database_connection_checks table is missing.")
                connection.rollback()
                return 1
            check_id = record_connection_check(
                cursor,
                dialect,
                "postgresql" if dialect in {"psycopg", "psycopg2"} else "sqlite",
                database_version,
                check_status,
                existing_tables,
                sample_summary,
                error_message,
            )
            connection.commit()
            print(f"Connection check record written: {check_id}")
        else:
            connection.rollback()
            print("Dry run enabled: connection check record was not written.")

        return 0 if not failures else 1
    finally:
        connection.close()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check AI_RAG database connectivity, foundation tables, and sample-data counts."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run checks without writing a database_connection_checks record.",
    )
    args = parser.parse_args()

    try:
        return run_check(write_record=not args.dry_run)
    except ConfigError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:  # noqa: BLE001 - CLI should show a clear, sanitized failure.
        print(f"Database connection check failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
