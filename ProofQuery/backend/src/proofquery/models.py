from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field, JsonValue


class VerificationStatus(StrEnum):
    VERIFIED = "verified"
    UNCERTAIN = "uncertain"
    NOT_REQUIRED = "not_required"


class ColumnProfile(BaseModel):
    name: str
    physical_type: str
    null_count: int
    null_rate: float
    distinct_count: int
    minimum: JsonValue | None = None
    maximum: JsonValue | None = None
    samples: list[JsonValue] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class DatasetMetadata(BaseModel):
    filename: str
    size_bytes: int
    row_count: int
    column_count: int


class DatasetProfile(BaseModel):
    filename: str
    size_bytes: int
    row_count: int
    columns: list[ColumnProfile]
    warnings: list[str] = Field(default_factory=list)
    suggested_questions: list[str] = Field(default_factory=list)


class QueryResult(BaseModel):
    columns: list[str]
    rows: list[list[JsonValue]]
    row_count: int
    duration_ms: int
    truncated: bool = False


class QueryEvidence(BaseModel):
    sql: str
    result: QueryResult


class ChartEncoding(BaseModel):
    field: str
    type: Literal["quantitative", "temporal", "nominal", "ordinal"]
    title: str | None = None


class ChartSpec(BaseModel):
    mark: Literal["bar", "line", "area", "point", "arc"]
    x: ChartEncoding | None = None
    y: ChartEncoding | None = None
    color: ChartEncoding | None = None
    title: str | None = None


class Evidence(BaseModel):
    status: VerificationStatus
    primary: QueryEvidence
    verification: QueryEvidence | None = None


class Answer(BaseModel):
    conclusion: str
    limitations: list[str] = Field(default_factory=list)
    chart: ChartSpec | None = None
    evidence: Evidence


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict[str, JsonValue] = Field(default_factory=dict)


class RunEvent(BaseModel):
    type: Literal["progress", "answer", "error"]
    stage: Literal[
        "planning",
        "querying",
        "charting",
        "verifying",
        "complete",
    ] | None = None
    message: str | None = None
    answer: Answer | None = None
    error: ErrorBody | None = None

