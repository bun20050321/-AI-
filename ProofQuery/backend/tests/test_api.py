import json

import pytest
from fastapi.testclient import TestClient

from proofquery.app import create_app
from proofquery.config import Settings
from proofquery.models import (
    Answer,
    Evidence,
    QueryEvidence,
    QueryResult,
    RunEvent,
    VerificationStatus,
)


class FakeAgent:
    async def run(self, session, question, emit, history=None):
        await emit(
            RunEvent(type="progress", stage="planning", message="正在规划分析")
        )
        await emit(
            RunEvent(type="progress", stage="querying", message="正在执行只读查询")
        )
        result = QueryResult(
            columns=["total"],
            rows=[[30]],
            row_count=1,
            duration_ms=2,
        )
        evidence = QueryEvidence(
            sql="select sum(revenue) total from dataset",
            result=result,
        )
        return Answer(
            conclusion="收入合计为 30。",
            evidence=Evidence(
                status=VerificationStatus.VERIFIED,
                primary=evidence,
                verification=QueryEvidence(
                    sql=(
                        "select sum(region_total) total from "
                        "(select region, sum(revenue) region_total "
                        "from dataset group by region)"
                    ),
                    result=result,
                ),
            ),
        )


@pytest.fixture
def api_settings():
    return Settings(
        openai_api_key="secret-api-key",
        openai_model="private-model-name",
        max_upload_bytes=1024,
        session_ttl_seconds=3600,
    )


@pytest.fixture
def client(api_settings):
    app = create_app(settings=api_settings, agent=FakeAgent())
    with TestClient(app) as test_client:
        yield test_client


def create_session(client: TestClient) -> str:
    response = client.post("/api/sessions")
    assert response.status_code == 201
    return response.json()["id"]


def upload_sales(client: TestClient, session_id: str):
    return client.post(
        f"/api/sessions/{session_id}/dataset",
        files={
            "file": (
                "sales.csv",
                b"region,revenue\nEast,10\nWest,20\n",
                "text/csv",
            )
        },
    )


def test_create_upload_profile_and_delete(client):
    session_id = create_session(client)

    response = upload_sales(client, session_id)

    assert response.status_code == 200
    assert response.json()["row_count"] == 2
    assert [column["name"] for column in response.json()["columns"]] == [
        "region",
        "revenue",
    ]
    assert client.get(f"/api/sessions/{session_id}/dataset").json() == response.json()
    assert client.delete(f"/api/sessions/{session_id}").status_code == 204
    missing = client.get(f"/api/sessions/{session_id}/dataset")
    assert missing.status_code == 404
    assert missing.json()["code"] == "SESSION_NOT_FOUND"


def test_question_run_streams_progress_and_answer(client):
    session_id = create_session(client)
    assert upload_sales(client, session_id).status_code == 200

    started = client.post(
        f"/api/sessions/{session_id}/questions",
        json={"question": "总收入是多少？"},
    )

    assert started.status_code == 202
    run_id = started.json()["run_id"]
    streamed = client.get(f"/api/sessions/{session_id}/runs/{run_id}/events")
    assert streamed.status_code == 200
    assert streamed.headers["content-type"].startswith("text/event-stream")
    assert streamed.text.count("event: progress") == 2
    assert "event: answer" in streamed.text
    answer_line = next(
        line for line in streamed.text.splitlines() if '"type":"answer"' in line
    )
    answer = json.loads(answer_line.removeprefix("data: "))
    assert answer["answer"]["evidence"]["status"] == "verified"


def test_api_uses_stable_errors_and_rejects_oversized_files(client):
    unknown = client.get("/api/sessions/not-real/dataset")
    assert unknown.status_code == 404
    assert unknown.json() == {
        "code": "SESSION_NOT_FOUND",
        "message": "The analysis session no longer exists.",
        "details": {},
    }

    session_id = create_session(client)
    oversized = client.post(
        f"/api/sessions/{session_id}/dataset",
        files={"file": ("large.csv", b"a" * 1025, "text/csv")},
    )
    assert oversized.status_code == 413
    assert oversized.json()["code"] == "CSV_TOO_LARGE"


def test_health_never_exposes_configuration_secrets(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    serialized = json.dumps(response.json())
    assert response.json() == {"status": "ok", "analysis_configured": True}
    assert "secret-api-key" not in serialized
    assert "private-model-name" not in serialized
    assert "ProofQuery, a careful" not in serialized
    assert "\\" not in serialized


def test_question_requires_dataset_and_nonempty_text(client):
    session_id = create_session(client)

    missing_dataset = client.post(
        f"/api/sessions/{session_id}/questions",
        json={"question": "概览"},
    )
    invalid_question = client.post(
        f"/api/sessions/{session_id}/questions",
        json={"question": "   "},
    )

    assert missing_dataset.status_code == 409
    assert missing_dataset.json()["code"] == "DATASET_REQUIRED"
    assert invalid_question.status_code == 422
    assert invalid_question.json()["code"] == "REQUEST_INVALID"
