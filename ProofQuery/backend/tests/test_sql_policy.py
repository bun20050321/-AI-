import pytest

from proofquery.errors import AppError
from proofquery.sql_policy import validate_sql


@pytest.mark.parametrize(
    "sql",
    [
        "delete from dataset",
        "update dataset set revenue = 0",
        "select 1; select 2",
        "copy dataset to 'leak.csv'",
        "select * from read_csv_auto('other.csv')",
        "select * from read_parquet('other.parquet')",
        "install httpfs",
        "load httpfs",
        "attach 'other.db' as other",
        "pragma version",
        "with changed as (delete from dataset returning *) select * from changed",
        "select * from information_schema.tables",
        "select * from main.dataset",
        "select * from query_table('dataset')",
    ],
)
def test_policy_rejects_non_read_only_or_external_sql(sql):
    with pytest.raises(AppError) as captured:
        validate_sql(sql)

    assert captured.value.code == "SQL_UNSAFE"
    assert "read-only" in captured.value.message


@pytest.mark.parametrize(
    "sql",
    [
        "select region, sum(revenue) as total from dataset group by region",
        "with totals as (select sum(revenue) total from dataset) select * from totals",
        'select * from "dataset"',
        "select 1 as health_check",
    ],
)
def test_policy_accepts_dataset_selects_and_local_ctes(sql):
    normalized = validate_sql(sql)

    assert normalized.startswith(("SELECT", "WITH"))
    assert ";" not in normalized


def test_policy_rejects_unknown_table_inside_cte():
    with pytest.raises(AppError) as captured:
        validate_sql("with source as (select * from secret) select * from source")

    assert captured.value.code == "SQL_UNSAFE"


def test_policy_returns_bounded_error_for_invalid_syntax():
    with pytest.raises(AppError) as captured:
        validate_sql("select from")

    assert captured.value.code == "SQL_INVALID"
    assert "select from" not in captured.value.message.lower()
