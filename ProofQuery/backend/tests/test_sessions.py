import asyncio
from datetime import timedelta
from types import SimpleNamespace

import pytest

from proofquery.errors import AppError
from proofquery.sessions import SessionRegistry


@pytest.fixture
def registry(settings, clock, tmp_path):
    registry = SessionRegistry(settings, clock=clock.now, temp_root=tmp_path)
    yield registry
    registry.close_all()


def test_delete_closes_connection_and_removes_temp_directory(registry):
    session = registry.create()
    temp_dir = session.temp_dir

    registry.delete(session.id)

    assert not temp_dir.exists()
    assert registry.get_optional(session.id) is None
    with pytest.raises(Exception):
        session.connection.execute("select 1")


def test_expire_idle_removes_only_stale_sessions(registry, clock):
    stale = registry.create()
    clock.current += timedelta(seconds=3599)
    fresh = registry.create()
    clock.current += timedelta(seconds=2)

    expired_count = registry.expire_idle()

    assert expired_count == 1
    assert registry.get_optional(stale.id) is None
    assert registry.get(fresh.id).id == fresh.id


def test_get_unknown_session_uses_stable_error(registry):
    with pytest.raises(AppError) as captured:
        registry.get("missing")

    assert captured.value.code == "SESSION_NOT_FOUND"
    assert "missing" not in captured.value.message


def test_sessions_disable_automatic_extension_loading(registry):
    session = registry.create()
    values = dict(
        session.connection.execute(
            "select name, value from duckdb_settings() where name in "
            "('allow_unsigned_extensions', 'autoinstall_known_extensions', 'autoload_known_extensions')"
        ).fetchall()
    )

    assert values == {
        "allow_unsigned_extensions": "false",
        "autoinstall_known_extensions": "false",
        "autoload_known_extensions": "false",
    }


async def test_delete_cancels_running_analysis_tasks(registry):
    session = registry.create()
    task = asyncio.create_task(asyncio.Event().wait())
    session.runs["run"] = SimpleNamespace(task=task)

    registry.delete(session.id)
    await asyncio.sleep(0)

    assert task.cancelled()
