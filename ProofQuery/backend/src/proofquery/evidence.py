import math
from numbers import Real

from proofquery.models import (
    Answer,
    ChartSpec,
    Evidence,
    QueryEvidence,
    QueryResult,
    VerificationStatus,
)
from proofquery.sql_policy import validate_sql


def _numeric_values(result: QueryResult) -> list[float]:
    return [
        float(value)
        for row in result.rows
        for value in row
        if isinstance(value, Real) and not isinstance(value, bool)
    ]


def _supports_claim(result: QueryResult, claim: float) -> bool:
    return any(
        math.isclose(value, float(claim), rel_tol=1e-6, abs_tol=1e-9)
        for value in _numeric_values(result)
    )


class EvidenceBuilder:
    def finalize(
        self,
        *,
        conclusion: str,
        primary: QueryEvidence,
        verification: QueryEvidence | None,
        numeric_claims: list[float],
        limitations: list[str] | None = None,
        chart: ChartSpec | None = None,
    ) -> Answer:
        final_limitations = list(limitations or [])
        if not numeric_claims:
            status = VerificationStatus.NOT_REQUIRED
        else:
            primary_sql = validate_sql(primary.sql)
            verification_sql = (
                validate_sql(verification.sql) if verification is not None else None
            )
            supported = bool(
                verification is not None
                and primary_sql != verification_sql
                and all(
                    _supports_claim(primary.result, claim)
                    and _supports_claim(verification.result, claim)
                    for claim in numeric_claims
                )
            )
            status = (
                VerificationStatus.VERIFIED
                if supported
                else VerificationStatus.UNCERTAIN
            )
            if not supported:
                final_limitations.append("独立验证未能支持该数值结论。")

        return Answer(
            conclusion=conclusion,
            limitations=list(dict.fromkeys(final_limitations)),
            chart=chart,
            evidence=Evidence(
                status=status,
                primary=primary,
                verification=verification,
            ),
        )
