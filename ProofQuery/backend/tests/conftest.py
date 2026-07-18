from datetime import datetime, timezone
from io import BytesIO

import pytest
from starlette.datastructures import Headers, UploadFile

from proofquery.config import Settings


class MutableClock:
    def __init__(self) -> None:
        self.current = datetime(2026, 7, 18, tzinfo=timezone.utc)

    def now(self) -> datetime:
        return self.current


@pytest.fixture
def settings() -> Settings:
    return Settings(
        openai_api_key=None,
        openai_model=None,
        max_upload_bytes=1024,
        session_ttl_seconds=3600,
    )


@pytest.fixture
def clock() -> MutableClock:
    return MutableClock()


@pytest.fixture
def upload_factory():
    def create(
        content: bytes,
        *,
        filename: str = "data.csv",
        content_type: str = "text/csv",
    ) -> UploadFile:
        return UploadFile(
            file=BytesIO(content),
            filename=filename,
            headers=Headers({"content-type": content_type}),
        )

    return create
