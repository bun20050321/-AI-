import asyncio
import tempfile
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import duckdb

from proofquery.config import Settings
from proofquery.errors import AppError
from proofquery.models import DatasetMetadata, DatasetProfile


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class Session:
    id: str
    temp_dir: Path
    connection: duckdb.DuckDBPyConnection
    lock: asyncio.Lock
    last_accessed: datetime
    _temporary_directory: tempfile.TemporaryDirectory[str] = field(repr=False)
    dataset_metadata: DatasetMetadata | None = None
    profile: DatasetProfile | None = None
    runs: dict[str, Any] = field(default_factory=dict)

    def close(self) -> None:
        for run in self.runs.values():
            task = getattr(run, "task", None)
            if task is not None and not task.done():
                task.cancel()
        self.connection.close()
        self._temporary_directory.cleanup()


class SessionRegistry:
    def __init__(
        self,
        settings: Settings,
        *,
        clock: Callable[[], datetime] = utc_now,
        temp_root: Path | None = None,
    ) -> None:
        self._settings = settings
        self._clock = clock
        self._temp_root = temp_root
        self._sessions: dict[str, Session] = {}

    def create(self) -> Session:
        temporary_directory = tempfile.TemporaryDirectory(
            prefix="proofquery-",
            dir=self._temp_root,
        )
        connection = duckdb.connect(
            database=":memory:",
            config={
                "allow_community_extensions": "false",
                "allow_unsigned_extensions": "false",
                "autoinstall_known_extensions": "false",
                "autoload_known_extensions": "false",
            },
        )
        session = Session(
            id=str(uuid4()),
            temp_dir=Path(temporary_directory.name),
            connection=connection,
            lock=asyncio.Lock(),
            last_accessed=self._clock(),
            _temporary_directory=temporary_directory,
        )
        self._sessions[session.id] = session
        return session

    def get(self, session_id: str) -> Session:
        session = self._sessions.get(session_id)
        if session is None:
            raise AppError(
                "SESSION_NOT_FOUND",
                "The analysis session no longer exists.",
            )
        session.last_accessed = self._clock()
        return session

    def get_optional(self, session_id: str) -> Session | None:
        return self._sessions.get(session_id)

    def active_sessions(self) -> tuple[Session, ...]:
        return tuple(self._sessions.values())

    def delete(self, session_id: str) -> None:
        session = self._sessions.pop(session_id, None)
        if session is not None:
            session.close()

    def expire_idle(self) -> int:
        now = self._clock()
        stale_ids = [
            session_id
            for session_id, session in self._sessions.items()
            if (now - session.last_accessed).total_seconds()
            > self._settings.session_ttl_seconds
        ]
        for session_id in stale_ids:
            self.delete(session_id)
        return len(stale_ids)

    def close_all(self) -> None:
        for session_id in list(self._sessions):
            self.delete(session_id)
