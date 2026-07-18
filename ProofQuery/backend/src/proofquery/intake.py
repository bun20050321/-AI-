import csv
from io import StringIO
from pathlib import Path

import duckdb
from charset_normalizer import from_bytes
from starlette.datastructures import UploadFile

from proofquery.errors import AppError
from proofquery.models import DatasetMetadata
from proofquery.sessions import Session


CHUNK_SIZE = 1024 * 1024


def _decode_csv(content: bytes) -> str:
    for encoding in ("utf-8-sig", "gb18030"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue

    match = from_bytes(content).best()
    if match is None:
        raise AppError("CSV_ENCODING", "The CSV encoding could not be read.")
    return str(match)


def _validate_rows(text: str) -> None:
    try:
        rows = csv.reader(StringIO(text, newline=""), strict=True)
        header = next(rows, None)
        if not header or not any(value.strip() for value in header):
            raise AppError("CSV_INVALID", "The CSV does not contain a header row.")
        width = len(header)
        data_rows = 0
        for row in rows:
            if not row:
                continue
            data_rows += 1
            if len(row) != width:
                raise AppError(
                    "CSV_INVALID",
                    "The CSV contains rows with inconsistent column counts.",
                )
        if data_rows == 0:
            raise AppError("CSV_INVALID", "The CSV does not contain any data rows.")
    except csv.Error as error:
        raise AppError("CSV_INVALID", "The CSV structure could not be read.") from error


async def _stream_upload(upload: UploadFile, path: Path, max_bytes: int) -> int:
    size = 0
    try:
        with path.open("wb") as destination:
            while chunk := await upload.read(CHUNK_SIZE):
                size += len(chunk)
                if size > max_bytes:
                    raise AppError(
                        "CSV_TOO_LARGE",
                        "The CSV exceeds the 50 MB upload limit.",
                    )
                destination.write(chunk)
    except Exception:
        path.unlink(missing_ok=True)
        raise
    return size


async def load_csv(
    session: Session,
    upload: UploadFile,
    *,
    max_bytes: int,
) -> DatasetMetadata:
    if session.dataset_metadata is not None:
        raise AppError(
            "DATASET_ALREADY_LOADED",
            "This session already contains a dataset.",
        )
    if not upload.filename or not upload.filename.lower().endswith(".csv"):
        raise AppError("CSV_REQUIRED", "Choose a file with a .csv extension.")

    source_path = session.temp_dir / "upload.part"
    normalized_path = session.temp_dir / "dataset.csv"
    size = await _stream_upload(upload, source_path, max_bytes)
    if size == 0:
        source_path.unlink(missing_ok=True)
        raise AppError("CSV_EMPTY", "The CSV is empty.")

    try:
        text = _decode_csv(source_path.read_bytes())
        _validate_rows(text)
        normalized_path.write_text(text, encoding="utf-8", newline="")
        source_path.unlink(missing_ok=True)

        session.connection.execute(
            "create table dataset as "
            "select * from read_csv(?, header=true, auto_detect=true, "
            "sample_size=-1, strict_mode=true)",
            [str(normalized_path)],
        )
        session.connection.execute("set enable_external_access=false")
        row_count = session.connection.execute(
            "select count(*) from dataset"
        ).fetchone()[0]
        column_count = len(session.connection.execute("describe dataset").fetchall())
    except AppError:
        source_path.unlink(missing_ok=True)
        normalized_path.unlink(missing_ok=True)
        raise
    except (duckdb.Error, UnicodeError, OSError) as error:
        source_path.unlink(missing_ok=True)
        normalized_path.unlink(missing_ok=True)
        try:
            session.connection.execute("drop table if exists dataset")
        except duckdb.Error:
            pass
        raise AppError("CSV_INVALID", "The CSV could not be imported.") from error

    metadata = DatasetMetadata(
        filename=Path(upload.filename).name,
        size_bytes=size,
        row_count=row_count,
        column_count=column_count,
    )
    session.dataset_metadata = metadata
    return metadata
