import json
from datetime import date
from types import SimpleNamespace

import pytest

from proofquery.agent import TOOLS, AnalysisAgent, build_agent_context
from proofquery.config import Settings
from proofquery.models import DatasetMetadata
from proofquery.profiler import profile_dataset
from proofquery.sessions import SessionRegistry


def function_call(name: str, arguments: dict, call_id: str):
    return SimpleNamespace(
        type="function_call",
        name=name,
        arguments=json.dumps(arguments),
        call_id=call_id,
    )


def response(*items, output_text: str = "", response_id: str = "response"):
    return SimpleNamespace(
        id=response_id,
        output=list(items),
        output_text=output_text,
    )


class FakeResponses:
    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        return self._responses.pop(0)


class FakeClient:
    def __init__(self, responses):
        self.responses = FakeResponses(responses)


@pytest.fixture
def agent_session(settings, clock, tmp_path):
    registry = SessionRegistry(settings, clock=clock.now, temp_root=tmp_path)
    session = registry.create()
    session.connection.execute(
        "create table dataset(region varchar, revenue double, ordered_on date)"
    )
    session.connection.executemany(
        "insert into dataset values (?, ?, ?)",
        [
            ("East", 10.0, date(2026, 1, 1)),
            ("West", 20.0, date(2026, 1, 2)),
            ("East", 20.0, date(2026, 1, 3)),
        ],
    )
    session.dataset_metadata = DatasetMetadata(
        filename="sales.csv",
        size_bytes=120,
        row_count=3,
        column_count=3,
    )
    profile_dataset(session)
    yield session
    registry.close_all()


@pytest.fixture
def agent_settings():
    return Settings(
        openai_api_key="test-key",
        openai_model="test-model",
        query_row_limit=500,
        query_timeout_seconds=1,
    )


async def test_agent_executes_schema_query_chart_and_verification(
    agent_session, agent_settings
):
    fake_client = FakeClient(
        [
            response(function_call("get_schema", {}, "schema"), response_id="r1"),
            response(
                function_call(
                    "run_query",
                    {
                        "sql": (
                            "select region, sum(revenue) total from dataset "
                            "group by region order by region"
                        )
                    },
                    "query",
                ),
                response_id="r2",
            ),
            response(
                function_call(
                    "create_chart",
                    {
                        "mark": "bar",
                        "x": {"field": "region", "type": "nominal"},
                        "y": {"field": "total", "type": "quantitative"},
                        "title": "Revenue by region",
                    },
                    "chart",
                ),
                response_id="r3",
            ),
            response(
                function_call(
                    "verify_result",
                    {
                        "sql": (
                            "select sum(revenue) total from dataset "
                            "where region = 'East'"
                        )
                    },
                    "verify",
                ),
                response_id="r4",
            ),
            response(
                output_text=json.dumps(
                    {
                        "conclusion": "East revenue was 30.",
                        "limitations": [],
                        "numeric_claims": [30],
                    }
                ),
                response_id="r5",
            ),
        ]
    )
    events = []
    agent = AnalysisAgent(client=fake_client, settings=agent_settings)

    answer = await agent.run(agent_session, "按地区比较收入", events.append)

    assert [event.stage for event in events] == [
        "planning",
        "querying",
        "charting",
        "verifying",
        "complete",
    ]
    assert answer.evidence.status == "verified"
    assert answer.chart.mark == "bar"
    assert answer.evidence.primary.result.columns == ["region", "total"]
    request_text = json.dumps(fake_client.responses.calls, ensure_ascii=False, default=str)
    assert "sales.csv" in request_text
    assert "C:\\" not in request_text
    assert "region,revenue" not in request_text


async def test_agent_allows_one_tool_repair(agent_session, agent_settings):
    fake_client = FakeClient(
        [
            response(
                function_call("run_query", {"sql": "drop table dataset"}, "bad"),
                response_id="r1",
            ),
            response(
                function_call(
                    "run_query",
                    {"sql": "select sum(revenue) total from dataset"},
                    "good",
                ),
                response_id="r2",
            ),
            response(
                function_call(
                    "verify_result",
                    {
                        "sql": (
                            "select sum(region_total) total from "
                            "(select region, sum(revenue) region_total "
                            "from dataset group by region)"
                        )
                    },
                    "verify",
                ),
                response_id="r3",
            ),
            response(
                output_text=json.dumps(
                    {
                        "conclusion": "Revenue was 50.",
                        "limitations": [],
                        "numeric_claims": [50],
                    }
                ),
                response_id="r4",
            ),
        ]
    )
    agent = AnalysisAgent(client=fake_client, settings=agent_settings)

    answer = await agent.run(agent_session, "总收入是多少？", lambda event: None)

    assert answer.evidence.status == "verified"
    assert len(fake_client.responses.calls) == 4


def test_agent_context_caps_samples_and_excludes_local_paths(agent_session):
    agent_session.profile.columns[0].samples = ["x" * 300]

    context = build_agent_context(agent_session.profile, "概览", [])
    serialized = json.dumps(context, ensure_ascii=False)

    assert "x" * 121 not in serialized
    assert "dataset.csv" not in serialized
    assert "temp_dir" not in serialized


def test_tool_object_schemas_are_strict_and_complete():
    def assert_strict_object(schema):
        if schema.get("type") == "object":
            assert schema.get("additionalProperties") is False
            assert set(schema.get("required", [])) == set(schema.get("properties", {}))
        for child in schema.get("properties", {}).values():
            if isinstance(child, dict):
                assert_strict_object(child)
        for child in schema.get("$defs", {}).values():
            assert_strict_object(child)

    for tool in TOOLS:
        assert tool["strict"] is True
        assert_strict_object(tool["parameters"])
