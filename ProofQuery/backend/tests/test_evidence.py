from proofquery.evidence import EvidenceBuilder
from proofquery.models import QueryEvidence, QueryResult, VerificationStatus


def query_result(value: float) -> QueryResult:
    return QueryResult(
        columns=["value"],
        rows=[[value]],
        row_count=1,
        duration_ms=1,
    )


def test_numeric_answer_requires_distinct_supporting_verification():
    builder = EvidenceBuilder()

    answer = builder.finalize(
        conclusion="Revenue was 100.",
        primary=QueryEvidence(
            sql="select sum(revenue) total from dataset",
            result=query_result(100),
        ),
        verification=QueryEvidence(
            sql=(
                "select sum(region_total) from "
                "(select region, sum(revenue) region_total from dataset group by region)"
            ),
            result=query_result(100),
        ),
        numeric_claims=[100],
    )

    assert answer.evidence.status == VerificationStatus.VERIFIED
    assert answer.limitations == []


def test_same_sql_or_mismatched_value_is_uncertain():
    builder = EvidenceBuilder()

    answer = builder.finalize(
        conclusion="Revenue was 100.",
        primary=QueryEvidence(
            sql="select sum(revenue) from dataset",
            result=query_result(100),
        ),
        verification=QueryEvidence(
            sql="select sum(revenue) from dataset",
            result=query_result(99),
        ),
        numeric_claims=[100],
    )

    assert answer.evidence.status == VerificationStatus.UNCERTAIN
    assert answer.limitations == ["独立验证未能支持该数值结论。"]


def test_non_numeric_answer_does_not_require_verification():
    builder = EvidenceBuilder()

    answer = builder.finalize(
        conclusion="The dataset contains a region column.",
        primary=QueryEvidence(
            sql="select region from dataset limit 1",
            result=QueryResult(
                columns=["region"],
                rows=[["East"]],
                row_count=1,
                duration_ms=1,
            ),
        ),
        verification=None,
        numeric_claims=[],
    )

    assert answer.evidence.status == VerificationStatus.NOT_REQUIRED
