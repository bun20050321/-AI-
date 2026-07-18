from datetime import date

import pytest

from proofquery.config import Settings
from proofquery.errors import AppError
from proofquery.query import execute_query
from proofquery.sessions import SessionRegistry


@pytest.fixture
def session(settings, clock, tmp_path):
    registry = SessionRegistry(settings, clock=clock.now, temp_root=tmp_path)
    session = registry.create()
    session.connection.execute(
        "create table dataset(id integer, region varchar, ordered_on date)"
    )
    session.connection.executemany(
        "insert into dataset values (?, ?, ?)",
        [
            (1, "East", date(2026, 1, 1)),
            (2, "West", date(2026, 1, 2)),
            (3, "North", date(2026, 1, 3)),
        ],
    )
    yield session
    registry.close_all()


@pytest.fixture
def query_settings(settings):
    return Settings(
        openai_api_key=None,
        openai_model=None,
        query_row_limit=2,
        query_timeout_seconds=1,
    )


async def test_execute_query_returns_json_safe_rows_and_truncates(
    session, query_settings
):
    result = await execute_query(
        session,
        "select id, region, ordered_on from dataset order by id",
        query_settings,
    )

    assert result.columns == ["id", "region", "ordered_on"]
    assert result.rows == [
        [1, "East", "2026-01-01"],
        [2, "West", "2026-01-02"],
    ]
    assert result.row_count == 2
    assert result.truncated is True
    assert result.duration_ms >= 0


async def test_execute_query_returns_stable_error_without_engine_details(
    session, query_settings
):
    with pytest.raises(AppError) as captured:
        await execute_query(session, "select missing from dataset", query_settings)

    assert captured.value.code == "QUERY_FAILED"
    assert "Binder Error" not in captured.value.message
    assert "missing" not in captured.value.message


async def test_execute_query_interrupts_long_running_work(session):
    timeout_settings = Settings(
        openai_api_key=None,
        openai_model=None,
        query_row_limit=2,
        query_timeout_seconds=0.01,
    )
    repeated_dataset = ", ".join(f"dataset t{index}" for index in range(18))

    with pytest.raises(AppError) as captured:
        await execute_query(
            session,
            f"select count(*) from {repeated_dataset}",
            timeout_settings,
        )

    assert captured.value.code == "QUERY_TIMEOUT"
    assert session.connection.execute("select count(*) from dataset").fetchone() == (3,)


async def test_execute_query_rejects_unsafe_sql_before_duckdb(
    session, query_settings
):
    with pytest.raises(AppError) as captured:
        await execute_query(session, "drop table dataset", query_settings)

    assert captured.value.code == "SQL_UNSAFE"
    assert session.connection.execute("select count(*) from dataset").fetchone() == (3,)
