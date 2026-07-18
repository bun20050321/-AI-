import inspect
import json
from collections.abc import Awaitable, Callable
from typing import Any, Protocol

from pydantic import ValidationError

from proofquery.config import Settings
from proofquery.errors import AppError
from proofquery.evidence import EvidenceBuilder
from proofquery.models import (
    Answer,
    ChartSpec,
    DatasetProfile,
    QueryEvidence,
    RunEvent,
)
from proofquery.query import execute_query
from proofquery.sessions import Session


SYSTEM_INSTRUCTIONS = """
You are ProofQuery, a careful CSV analysis agent. Use only the supplied tools.
Every data question must use run_query. Numeric conclusions must also use
verify_result with a materially different SQL aggregation or reconciliation.
Use create_chart only when a chart improves comparison or trend reading.
Never claim a verification status yourself. When tools are complete, return
only JSON with conclusion (string), limitations (string array), and
numeric_claims (number array). Keep the conclusion in the user's language.
""".strip()


TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "name": "get_schema",
        "description": "Return the bounded schema and data-quality profile.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "run_query",
        "description": "Run one read-only DuckDB SELECT against dataset.",
        "parameters": {
            "type": "object",
            "properties": {"sql": {"type": "string"}},
            "required": ["sql"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "create_chart",
        "description": "Create a validated chart from the primary query columns.",
        "parameters": {
            "type": "object",
            "properties": {
                "mark": {"enum": ["bar", "line", "area", "point", "arc"]},
                "x": {
                    "anyOf": [
                        {"$ref": "#/$defs/encoding"},
                        {"type": "null"},
                    ]
                },
                "y": {
                    "anyOf": [
                        {"$ref": "#/$defs/encoding"},
                        {"type": "null"},
                    ]
                },
                "color": {
                    "anyOf": [
                        {"$ref": "#/$defs/encoding"},
                        {"type": "null"},
                    ]
                },
                "title": {"type": ["string", "null"]},
            },
            "required": ["mark", "x", "y", "color", "title"],
            "additionalProperties": False,
            "$defs": {
                "encoding": {
                    "type": "object",
                    "properties": {
                        "field": {"type": "string"},
                        "type": {
                            "enum": ["quantitative", "temporal", "nominal", "ordinal"]
                        },
                        "title": {"type": ["string", "null"]},
                    },
                    "required": ["field", "type", "title"],
                    "additionalProperties": False,
                }
            },
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "verify_result",
        "description": "Run a distinct read-only query that independently checks a numeric claim.",
        "parameters": {
            "type": "object",
            "properties": {"sql": {"type": "string"}},
            "required": ["sql"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]


class ResponsesAPI(Protocol):
    async def create(self, **kwargs: Any) -> Any: ...


class OpenAIClient(Protocol):
    responses: ResponsesAPI


Emitter = Callable[[RunEvent], Awaitable[None] | None]


def build_agent_context(
    profile: DatasetProfile,
    question: str,
    history: list[dict[str, str]],
) -> dict[str, Any]:
    profile_data = profile.model_dump(mode="json")
    for column in profile_data["columns"]:
        column["samples"] = [
            value[:120] if isinstance(value, str) else value
            for value in column["samples"][:5]
        ]
    return {
        "question": question,
        "dataset": profile_data,
        "recent_history": history[-6:],
    }


def _read(item: Any, name: str, default: Any = None) -> Any:
    if isinstance(item, dict):
        return item.get(name, default)
    return getattr(item, name, default)


def _input_item(item: Any) -> Any:
    if hasattr(item, "model_dump"):
        return item.model_dump(mode="json")
    if isinstance(item, dict):
        return item
    return {
        "type": _read(item, "type"),
        "name": _read(item, "name"),
        "arguments": _read(item, "arguments"),
        "call_id": _read(item, "call_id"),
    }


async def _emit(emit: Emitter, event: RunEvent) -> None:
    emitted = emit(event)
    if inspect.isawaitable(emitted):
        await emitted


def _validate_chart(spec: ChartSpec, primary: QueryEvidence | None) -> ChartSpec:
    if primary is None:
        raise AppError("CHART_REQUIRES_QUERY", "Run a query before creating a chart.")
    available = set(primary.result.columns)
    encodings = [spec.x, spec.y, spec.color]
    if not any(encoding is not None for encoding in encodings):
        raise AppError("CHART_INVALID", "The chart needs at least one data field.")
    if any(
        encoding is not None and encoding.field not in available
        for encoding in encodings
    ):
        raise AppError("CHART_INVALID", "The chart references an unknown result field.")
    return spec


class AnalysisAgent:
    def __init__(
        self,
        *,
        client: OpenAIClient,
        settings: Settings,
        evidence_builder: EvidenceBuilder | None = None,
    ) -> None:
        self._client = client
        self._settings = settings
        self._evidence_builder = evidence_builder or EvidenceBuilder()

    async def run(
        self,
        session: Session,
        question: str,
        emit: Emitter,
        history: list[dict[str, str]] | None = None,
    ) -> Answer:
        if not self._settings.openai_api_key or not self._settings.openai_model:
            raise AppError(
                "OPENAI_NOT_CONFIGURED",
                "Natural-language analysis is not configured.",
            )
        if session.profile is None:
            raise AppError("DATASET_REQUIRED", "Upload a CSV before analyzing it.")

        await _emit(
            emit,
            RunEvent(type="progress", stage="planning", message="正在规划分析"),
        )
        context = build_agent_context(session.profile, question, history or [])
        input_items: list[Any] = [
            {
                "role": "user",
                "content": json.dumps(context, ensure_ascii=False),
            }
        ]
        primary: QueryEvidence | None = None
        verification: QueryEvidence | None = None
        chart: ChartSpec | None = None
        failure_count = 0

        for _ in range(8):
            response = await self._client.responses.create(
                model=self._settings.openai_model,
                instructions=SYSTEM_INSTRUCTIONS,
                input=input_items,
                tools=TOOLS,
                max_tool_calls=8,
                parallel_tool_calls=False,
                store=False,
            )
            function_calls = [
                item
                for item in _read(response, "output", [])
                if _read(item, "type") == "function_call"
            ]
            if not function_calls:
                try:
                    payload = json.loads(_read(response, "output_text", ""))
                    conclusion = str(payload["conclusion"]).strip()
                    limitations = [str(value) for value in payload.get("limitations", [])]
                    numeric_claims = [
                        float(value) for value in payload.get("numeric_claims", [])
                    ]
                except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
                    raise AppError(
                        "AGENT_RESPONSE_INVALID",
                        "The analysis response was not in the expected format.",
                    ) from error
                if not conclusion or primary is None:
                    raise AppError(
                        "AGENT_RESPONSE_INVALID",
                        "The analysis did not include query evidence.",
                    )
                answer = self._evidence_builder.finalize(
                    conclusion=conclusion,
                    primary=primary,
                    verification=verification,
                    numeric_claims=numeric_claims,
                    limitations=limitations,
                    chart=chart,
                )
                await _emit(
                    emit,
                    RunEvent(
                        type="progress",
                        stage="complete",
                        message="分析完成",
                    ),
                )
                return answer

            for call in function_calls:
                input_items.append(_input_item(call))
                name = _read(call, "name")
                call_id = _read(call, "call_id")
                try:
                    arguments = json.loads(_read(call, "arguments", "{}"))
                    if name == "get_schema":
                        output: Any = session.profile.model_dump(mode="json")
                    elif name == "run_query":
                        await _emit(
                            emit,
                            RunEvent(
                                type="progress",
                                stage="querying",
                                message="正在执行只读查询",
                            ),
                        )
                        result = await execute_query(
                            session,
                            str(arguments["sql"]),
                            self._settings,
                        )
                        primary = QueryEvidence(sql=str(arguments["sql"]), result=result)
                        output = result.model_dump(mode="json")
                    elif name == "create_chart":
                        await _emit(
                            emit,
                            RunEvent(
                                type="progress",
                                stage="charting",
                                message="正在生成图表",
                            ),
                        )
                        chart = _validate_chart(
                            ChartSpec.model_validate(arguments),
                            primary,
                        )
                        output = chart.model_dump(mode="json")
                    elif name == "verify_result":
                        await _emit(
                            emit,
                            RunEvent(
                                type="progress",
                                stage="verifying",
                                message="正在独立验证结果",
                            ),
                        )
                        result = await execute_query(
                            session,
                            str(arguments["sql"]),
                            self._settings,
                        )
                        verification = QueryEvidence(
                            sql=str(arguments["sql"]),
                            result=result,
                        )
                        output = result.model_dump(mode="json")
                    else:
                        raise AppError("TOOL_UNKNOWN", "The requested tool is unavailable.")
                    tool_output = {"ok": True, "result": output}
                except (
                    AppError,
                    KeyError,
                    TypeError,
                    ValueError,
                    ValidationError,
                    json.JSONDecodeError,
                ) as error:
                    failure_count += 1
                    if failure_count > 1:
                        raise AppError(
                            "AGENT_TOOL_FAILED",
                            "The analysis could not recover from a tool error.",
                        ) from error
                    code = error.code if isinstance(error, AppError) else "TOOL_ARGUMENT_INVALID"
                    tool_output = {
                        "ok": False,
                        "error": {
                            "code": code,
                            "message": "Correct the tool arguments and try once more.",
                        },
                    }
                input_items.append(
                    {
                        "type": "function_call_output",
                        "call_id": call_id,
                        "output": json.dumps(tool_output, ensure_ascii=False),
                    }
                )

        raise AppError(
            "AGENT_STEP_LIMIT",
            "The analysis exceeded the maximum number of tool steps.",
        )
