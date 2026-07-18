from datetime import date

import pytest

from proofquery.errors import AppError
from proofquery.models import DatasetMetadata
from proofquery.profiler import profile_dataset, quote_identifier
from proofquery.sessions import SessionRegistry


@pytest.fixture
def session(settings, clock, tmp_path):
    registry = SessionRegistry(settings, clock=clock.now, temp_root=tmp_path)
    session = registry.create()
    yield session
    registry.close_all()


@pytest.fixture
def session_with_sales(session):
    session.connection.execute(
        """
        create table dataset(
            region varchar,
            revenue double,
            ordered_on date,
            note varchar
        )
        """
    )
    session.connection.executemany(
        "insert into dataset values (?, ?, ?, ?)",
        [
            ("East", 10.0, date(2026, 1, 1), "alpha"),
            ("West", 20.0, date(2026, 1, 2), "beta"),
            ("East", None, date(2026, 1, 3), "gamma"),
            ("North", 30.0, date(2026, 1, 4), "delta"),
        ],
    )
    session.dataset_metadata = DatasetMetadata(
        filename="sales.csv",
        size_bytes=128,
        row_count=4,
        column_count=4,
    )
    return session


def test_profile_reports_quality_ranges_and_capped_samples(session_with_sales):
    profile = profile_dataset(session_with_sales)
    revenue = next(column for column in profile.columns if column.name == "revenue")
    ordered_on = next(
        column for column in profile.columns if column.name == "ordered_on"
    )

    assert profile.row_count == 4
    assert revenue.null_count == 1
    assert revenue.null_rate == 0.25
    assert revenue.distinct_count == 3
    assert revenue.minimum == 10.0
    assert revenue.maximum == 30.0
    assert len(revenue.samples) <= 5
    assert ordered_on.minimum == "2026-01-01"
    assert ordered_on.maximum == "2026-01-04"
    assert any("缺失" in warning for warning in revenue.warnings)


def test_profile_truncates_long_values_before_model_context(session):
    session.connection.execute("create table dataset(description varchar)")
    session.connection.execute("insert into dataset values (?)", ["x" * 300])
    session.dataset_metadata = DatasetMetadata(
        filename="long.csv",
        size_bytes=320,
        row_count=1,
        column_count=1,
    )

    profile = profile_dataset(session)

    assert len(profile.columns[0].samples[0]) == 120


def test_profile_quotes_unusual_column_names(session):
    session.connection.execute('create table dataset("revenue total" integer)')
    session.connection.execute('insert into dataset values (10), (20)')
    session.dataset_metadata = DatasetMetadata(
        filename="quoted.csv",
        size_bytes=40,
        row_count=2,
        column_count=1,
    )

    profile = profile_dataset(session)

    assert quote_identifier('a"b') == '"a""b"'
    assert profile.columns[0].name == "revenue total"
    assert profile.columns[0].maximum == 20


def test_profile_generates_deterministic_suggestions(session_with_sales):
    profile = profile_dataset(session_with_sales)

    assert profile.suggested_questions == [
        "按 region 比较 revenue",
        "查看 ordered_on 上 revenue 的变化趋势",
        "检查缺失值和数据质量",
    ]


def test_profile_requires_a_registered_dataset(session):
    with pytest.raises(AppError) as captured:
        profile_dataset(session)

    assert captured.value.code == "DATASET_REQUIRED"
