import asyncio
import math
from contextlib import suppress
from datetime import date, datetime, time
from decimal import Decimal
from time import perf_counter
from typing import Any

import duckdb
from pydantic import JsonValue

from proofquery.config import Settings
from proofquery.errors import AppError
from proofquery.models import QueryResult
from proofquery.sessions import Session
from proofquery.sql_policy import validate_sql


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


def _execute_sync(
    session: Session,
    normalized_sql: str,
    row_limit: int,
) -> QueryResult:
    started = perf_counter()
    bounded_sql = (
        f"select * from ({normalized_sql}) as proofquery_result limit {row_limit + 1}"
    )
    try:
        cursor = session.connection.execute(bounded_sql)
        fetched_rows = cursor.fetchmany(row_limit + 1)
        columns = [description[0] for description in cursor.description]
    except duckdb.Error as error:
        raise AppError(
            "QUERY_FAILED",
            "The read-only query could not be completed.",
        ) from error

    truncated = len(fetched_rows) > row_limit
    rows = fetched_rows[:row_limit]
    return QueryResult(
        columns=columns,
        rows=[[_json_value(value) for value in row] for row in rows],
        row_count=len(rows),
        duration_ms=max(0, round((perf_counter() - started) * 1000)),
        truncated=truncated,
    )


async def execute_query(
    session: Session,
    sql: str,
    settings: Settings,
) -> QueryResult:
    normalized_sql = validate_sql(sql)
    async with session.lock:
        query_task = asyncio.create_task(
            asyncio.to_thread(
                _execute_sync,
                session,
                normalized_sql,
                settings.query_row_limit,
            )
        )
        try:
            return await asyncio.wait_for(
                asyncio.shield(query_task),
                timeout=settings.query_timeout_seconds,
            )
        except TimeoutError as error:
            session.connection.interrupt()
            with suppress(AppError, duckdb.Error):
                await query_task
            raise AppError(
                "QUERY_TIMEOUT",
                "The query exceeded the 10 second execution limit.",
            ) from error
