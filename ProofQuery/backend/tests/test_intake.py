import pytest

from proofquery.errors import AppError
from proofquery.intake import load_csv
from proofquery.sessions import SessionRegistry


@pytest.fixture
def session(settings, clock, tmp_path):
    registry = SessionRegistry(settings, clock=clock.now, temp_root=tmp_path)
    session = registry.create()
    yield session
    registry.close_all()


async def test_load_csv_registers_only_dataset_table(session, upload_factory):
    upload = upload_factory(b"region,revenue\nEast,10\nWest,20\nNorth,30\n")

    metadata = await load_csv(session, upload, max_bytes=1024)

    assert metadata.filename == "data.csv"
    assert metadata.row_count == 3
    assert metadata.column_count == 2
    assert session.connection.execute("show tables").fetchall() == [("dataset",)]
    assert session.connection.execute("select current_setting('enable_external_access')").fetchone() == (False,)


async def test_load_csv_rejects_oversized_stream_without_registration(
    session, upload_factory
):
    upload = upload_factory(b"a" * 1025)

    with pytest.raises(AppError) as captured:
        await load_csv(session, upload, max_bytes=1024)

    assert captured.value.code == "CSV_TOO_LARGE"
    assert session.connection.execute("show tables").fetchall() == []
    assert list(session.temp_dir.iterdir()) == []


@pytest.mark.parametrize(
    ("filename", "content", "expected_code"),
    [
        ("data.txt", b"a,b\n1,2\n", "CSV_REQUIRED"),
        ("data.csv", b"", "CSV_EMPTY"),
        ("data.csv", b"not,a,csv\n1\n2,3,4\n", "CSV_INVALID"),
    ],
)
async def test_load_csv_rejects_invalid_inputs(
    session, upload_factory, filename, content, expected_code
):
    upload = upload_factory(content, filename=filename)

    with pytest.raises(AppError) as captured:
        await load_csv(session, upload, max_bytes=1024)

    assert captured.value.code == expected_code
    assert session.connection.execute("show tables").fetchall() == []
    assert list(session.temp_dir.iterdir()) == []


async def test_load_csv_accepts_gb18030_and_normalizes_to_utf8(
    session, upload_factory
):
    upload = upload_factory("地区,收入\n华东,10\n华西,20\n".encode("gb18030"))

    metadata = await load_csv(session, upload, max_bytes=1024)

    assert metadata.row_count == 2
    assert session.connection.execute('select "地区" from dataset order by "收入"').fetchall() == [
        ("华东",),
        ("华西",),
    ]


async def test_load_csv_rejects_second_dataset(session, upload_factory):
    await load_csv(session, upload_factory(b"a,b\n1,2\n"), max_bytes=1024)

    with pytest.raises(AppError) as captured:
        await load_csv(session, upload_factory(b"a,b\n3,4\n"), max_bytes=1024)

    assert captured.value.code == "DATASET_ALREADY_LOADED"
