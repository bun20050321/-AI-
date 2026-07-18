import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress
from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, Request, Response, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, StreamingResponse
from openai import AsyncOpenAI
from pydantic import BaseModel, Field, field_validator

from proofquery.agent import AnalysisAgent
from proofquery.config import Settings
from proofquery.errors import AppError
from proofquery.intake import load_csv
from proofquery.models import Answer, ErrorBody, RunEvent
from proofquery.profiler import profile_dataset
from proofquery.sessions import Session, SessionRegistry


class SessionResponse(BaseModel):
    id: str


class QuestionRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)

    @field_validator("question")
    @classmethod
    def strip_question(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Question cannot be blank")
        return value


class RunResponse(BaseModel):
    run_id: str


@dataclass
class AnalysisRun:
    id: str
    question: str
    events: list[RunEvent] = field(default_factory=list)
    complete: bool = False
    answer: Answer | None = None
    task: asyncio.Task[None] | None = None
    condition: asyncio.Condition = field(default_factory=asyncio.Condition)

    async def publish(self, event: RunEvent) -> None:
        async with self.condition:
            self.events.append(event)
            if event.type in {"answer", "error"}:
                self.complete = True
            self.condition.notify_all()


ERROR_STATUS = {
    "SESSION_NOT_FOUND": status.HTTP_404_NOT_FOUND,
    "RUN_NOT_FOUND": status.HTTP_404_NOT_FOUND,
    "CSV_TOO_LARGE": status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
    "DATASET_REQUIRED": status.HTTP_409_CONFLICT,
    "DATASET_ALREADY_LOADED": status.HTTP_409_CONFLICT,
    "OPENAI_NOT_CONFIGURED": status.HTTP_503_SERVICE_UNAVAILABLE,
    "QUERY_TIMEOUT": status.HTTP_408_REQUEST_TIMEOUT,
}


def _error_response(error: AppError) -> JSONResponse:
    body = ErrorBody(
        code=error.code,
        message=error.message,
        details=error.details,
    )
    return JSONResponse(
        status_code=ERROR_STATUS.get(error.code, status.HTTP_400_BAD_REQUEST),
        content=body.model_dump(mode="json"),
    )


async def _expire_sessions(registry: SessionRegistry) -> None:
    while True:
        await asyncio.sleep(60)
        registry.expire_idle()


async def _cancel_session_runs(session: Session) -> None:
    tasks = [
        run.task
        for run in session.runs.values()
        if isinstance(run, AnalysisRun) and run.task is not None and not run.task.done()
    ]
    for task in tasks:
        task.cancel()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


def _history(session: Session) -> list[dict[str, str]]:
    history: list[dict[str, str]] = []
    for run in session.runs.values():
        if isinstance(run, AnalysisRun) and run.answer is not None:
            history.extend(
                [
                    {"role": "user", "content": run.question},
                    {"role": "assistant", "content": run.answer.conclusion},
                ]
            )
    return history[-6:]


async def _run_analysis(
    agent: Any,
    session: Session,
    run: AnalysisRun,
) -> None:
    try:
        answer = await agent.run(
            session,
            run.question,
            run.publish,
            history=_history(session),
        )
        run.answer = answer
        await run.publish(RunEvent(type="answer", answer=answer))
    except asyncio.CancelledError:
        raise
    except AppError as error:
        await run.publish(
            RunEvent(
                type="error",
                error=ErrorBody(
                    code=error.code,
                    message=error.message,
                    details=error.details,
                ),
            )
        )
    except Exception:
        await run.publish(
            RunEvent(
                type="error",
                error=ErrorBody(
                    code="ANALYSIS_FAILED",
                    message="The analysis could not be completed.",
                ),
            )
        )


async def _stream_events(run: AnalysisRun) -> AsyncIterator[str]:
    index = 0
    while True:
        timed_out = False
        async with run.condition:
            if index >= len(run.events) and not run.complete:
                try:
                    await asyncio.wait_for(run.condition.wait(), timeout=15)
                except TimeoutError:
                    timed_out = True
            if index < len(run.events):
                event = run.events[index]
                index += 1
            else:
                event = None
                complete = run.complete

        if timed_out:
            yield ": heartbeat\n\n"
            continue
        if event is not None:
            yield (
                f"event: {event.type}\n"
                f"data: {event.model_dump_json(exclude_none=True)}\n\n"
            )
            if event.type in {"answer", "error"}:
                return
        elif complete:
            return


def create_app(
    *,
    settings: Settings | None = None,
    agent: Any | None = None,
) -> FastAPI:
    resolved_settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        registry = SessionRegistry(resolved_settings)
        resolved_agent = agent
        if resolved_agent is None:
            api_key = (
                resolved_settings.openai_api_key.get_secret_value()
                if resolved_settings.openai_api_key
                else "not-configured"
            )
            resolved_agent = AnalysisAgent(
                client=AsyncOpenAI(api_key=api_key),
                settings=resolved_settings,
            )
        app.state.registry = registry
        app.state.agent = resolved_agent
        cleanup_task = asyncio.create_task(_expire_sessions(registry))
        try:
            yield
        finally:
            cleanup_task.cancel()
            with suppress(asyncio.CancelledError):
                await cleanup_task
            for session in registry.active_sessions():
                await _cancel_session_runs(session)
            registry.close_all()

    app = FastAPI(title="ProofQuery API", version="0.1.0", lifespan=lifespan)

    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, error: AppError) -> JSONResponse:
        return _error_response(error)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request,
        error: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=ErrorBody(
                code="REQUEST_INVALID",
                message="The request is invalid.",
            ).model_dump(mode="json"),
        )

    @app.get("/api/health")
    async def health() -> dict[str, bool | str]:
        return {
            "status": "ok",
            "analysis_configured": bool(
                resolved_settings.openai_api_key and resolved_settings.openai_model
            ),
        }

    @app.post(
        "/api/sessions",
        response_model=SessionResponse,
        status_code=status.HTTP_201_CREATED,
    )
    async def create_session(request: Request) -> SessionResponse:
        session = request.app.state.registry.create()
        return SessionResponse(id=session.id)

    @app.post("/api/sessions/{session_id}/dataset")
    async def upload_dataset(
        session_id: str,
        request: Request,
        file: UploadFile,
    ):
        session = request.app.state.registry.get(session_id)
        await load_csv(
            session,
            file,
            max_bytes=resolved_settings.max_upload_bytes,
        )
        return profile_dataset(session)

    @app.get("/api/sessions/{session_id}/dataset")
    async def get_dataset(session_id: str, request: Request):
        session = request.app.state.registry.get(session_id)
        if session.profile is None:
            raise AppError("DATASET_REQUIRED", "Upload a CSV before analyzing it.")
        return session.profile

    @app.post(
        "/api/sessions/{session_id}/questions",
        response_model=RunResponse,
        status_code=status.HTTP_202_ACCEPTED,
    )
    async def ask_question(
        session_id: str,
        payload: QuestionRequest,
        request: Request,
    ) -> RunResponse:
        session = request.app.state.registry.get(session_id)
        if session.profile is None:
            raise AppError("DATASET_REQUIRED", "Upload a CSV before analyzing it.")
        run = AnalysisRun(id=str(uuid4()), question=payload.question)
        session.runs[run.id] = run
        run.task = asyncio.create_task(
            _run_analysis(request.app.state.agent, session, run)
        )
        return RunResponse(run_id=run.id)

    @app.get("/api/sessions/{session_id}/runs/{run_id}/events")
    async def stream_run_events(
        session_id: str,
        run_id: str,
        request: Request,
    ) -> StreamingResponse:
        session = request.app.state.registry.get(session_id)
        run = session.runs.get(run_id)
        if not isinstance(run, AnalysisRun):
            raise AppError("RUN_NOT_FOUND", "The analysis run no longer exists.")
        return StreamingResponse(
            _stream_events(run),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    @app.delete(
        "/api/sessions/{session_id}",
        status_code=status.HTTP_204_NO_CONTENT,
    )
    async def delete_session(session_id: str, request: Request) -> Response:
        session = request.app.state.registry.get(session_id)
        await _cancel_session_runs(session)
        request.app.state.registry.delete(session_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return app


app = create_app()
