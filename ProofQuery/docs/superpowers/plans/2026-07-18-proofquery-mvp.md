# ProofQuery MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local single-user workspace that profiles one CSV and answers natural-language questions with read-only SQL, charts, and independently verified evidence.

**Architecture:** A React and TypeScript workspace calls a FastAPI service. The service owns ephemeral sessions, a locked in-process DuckDB connection, an OpenAI Responses API tool loop, and structured evidence objects; the browser renders those objects without receiving secrets or arbitrary HTML.

**Tech Stack:** Python 3.12, FastAPI, Pydantic 2, DuckDB, SQLGlot, OpenAI Python SDK, React, TypeScript, Vite, Vega-Lite, Lucide React, Pytest, Vitest, Testing Library, Playwright.

## Global Constraints

- Accept exactly one CSV per session and reject uploads larger than 50 MB.
- Keep session files and conversation state only in memory and a process-owned temporary directory; expire inactive sessions after 60 minutes.
- Read `OPENAI_API_KEY` and `OPENAI_MODEL` on the server; never hard-code or return either value.
- Send only schema, capped samples, aggregates, tool results, and conversation context to OpenAI; never send the complete CSV.
- Permit one parsed `SELECT` statement or a `WITH` query ending in `SELECT`; reject external access and every mutation or export operation.
- Cap query results at 500 rows and interrupt execution after 10 seconds.
- Require a distinct verification query before marking a numeric conclusion `verified`.
- Keep the core test suites deterministic and runnable without an OpenAI API key.
- Support Chinese and English UI content and questions.
- Keep desktop and mobile content readable without overlap.

## File Map

```text
backend/
  pyproject.toml                    Python dependencies and test configuration
  src/proofquery/config.py          Environment-backed settings
  src/proofquery/models.py          Shared API and domain schemas
  src/proofquery/errors.py          Stable application error codes
  src/proofquery/sessions.py        Ephemeral session ownership and cleanup
  src/proofquery/intake.py          Bounded CSV streaming and DuckDB registration
  src/proofquery/profiler.py        Schema and quality profile generation
  src/proofquery/sql_policy.py      SQL AST validation
  src/proofquery/query.py           Locked, bounded DuckDB execution
  src/proofquery/evidence.py        Verification and answer-status rules
  src/proofquery/agent.py           Responses API tool loop
  src/proofquery/app.py             FastAPI routes, lifecycle, and event streaming
  tests/                            Unit and API integration tests
frontend/
  package.json                      Frontend scripts and dependencies
  vite.config.ts                    Vite and Vitest configuration
  src/api.ts                        Typed backend client and event-stream parser
  src/types.ts                      Frontend contract types
  src/state.ts                      Workspace reducer
  src/App.tsx                       Responsive application shell
  src/components/                   Focused workspace components
  src/styles.css                    Tokens and responsive layout
  src/**/*.test.tsx                 Component tests
  e2e/proofquery.spec.ts            Desktop and mobile browser flows
sample-data/sales.csv               Small deterministic demonstration dataset
.env.example                        Required server configuration names
README.md                           Local setup, operation, and security notes
```

---

### Task 1: Project Foundation And Domain Contracts

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/src/proofquery/__init__.py`
- Create: `backend/src/proofquery/config.py`
- Create: `backend/src/proofquery/models.py`
- Create: `backend/src/proofquery/errors.py`
- Create: `backend/tests/test_config.py`
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.app.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/vite-env.d.ts`
- Create: `frontend/src/types.ts`
- Create: `.gitignore`
- Create: `.env.example`

**Interfaces:**
- Consumes: the global constraints in this plan.
- Produces: `Settings`, `AppError`, `DatasetProfile`, `QueryResult`, `ChartSpec`, `Evidence`, `Answer`, and matching TypeScript interfaces.

- [ ] **Step 1: Write the failing settings test**

```python
def test_settings_require_model_and_keep_secrets_out_of_repr(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "secret-test-key")
    monkeypatch.setenv("OPENAI_MODEL", "test-model")
    settings = Settings()
    assert settings.openai_model == "test-model"
    assert "secret-test-key" not in repr(settings)
    assert settings.max_upload_bytes == 50 * 1024 * 1024
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `python -m pytest backend/tests/test_config.py -v`

Expected: FAIL because `proofquery.config` does not exist.

- [ ] **Step 3: Create the package configuration and exact domain contracts**

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    openai_api_key: SecretStr | None = None
    openai_model: str | None = None
    max_upload_bytes: int = 50 * 1024 * 1024
    session_ttl_seconds: int = 3600
    query_timeout_seconds: float = 10.0
    query_row_limit: int = 500

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
    samples: list[JsonValue] = []
    warnings: list[str] = []

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
    warnings: list[str] = []
    suggested_questions: list[str] = []

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
    limitations: list[str] = []
    chart: ChartSpec | None = None
    evidence: Evidence

class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict[str, JsonValue] = {}

class RunEvent(BaseModel):
    type: Literal["progress", "answer", "error"]
    stage: Literal["planning", "querying", "charting", "verifying", "complete"] | None = None
    message: str | None = None
    answer: Answer | None = None
    error: ErrorBody | None = None

class AppError(Exception):
    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}
```

Mirror these field names and literal unions exactly in `frontend/src/types.ts`.

- [ ] **Step 4: Add installable frontend and backend scripts**

`backend/pyproject.toml` exposes `pytest` settings and dependencies for FastAPI, DuckDB, SQLGlot, OpenAI, multipart uploads, charset detection, and tests. `frontend/package.json` exposes `dev`, `build`, `test`, and `test:e2e` scripts with React, Vega, Lucide, Vitest, Testing Library, and Playwright.

Create a minimal `frontend/src/App.tsx` returning `<main><h1>ProofQuery</h1></main>` and mount it from `frontend/src/main.tsx`. This is the buildable first increment; Task 7 replaces the component body while preserving the default export.

Run: `python -m pip install -e "backend[dev]"`

Expected: editable `proofquery` package and test dependencies install successfully.

Run: `npm --prefix frontend install`

Expected: dependencies install and `frontend/package-lock.json` is generated.

- [ ] **Step 5: Run contract checks**

Run: `python -m pytest backend/tests/test_config.py -v`

Expected: PASS.

Run: `npm --prefix frontend run build`

Expected: PASS with a Vite production bundle.

- [ ] **Step 6: Commit the foundation**

```bash
git add .gitignore .env.example backend frontend
git commit -m "build: scaffold ProofQuery applications"
```

### Task 2: Ephemeral Sessions And CSV Intake

**Files:**
- Create: `backend/src/proofquery/sessions.py`
- Create: `backend/src/proofquery/intake.py`
- Create: `backend/tests/test_sessions.py`
- Create: `backend/tests/test_intake.py`

**Interfaces:**
- Consumes: `Settings`, `AppError`, `DatasetMetadata`.
- Produces: `SessionRegistry.create() -> Session`, `SessionRegistry.delete(session_id)`, `SessionRegistry.expire_idle()`, and `load_csv(session, upload) -> DatasetMetadata`.

- [ ] **Step 1: Write failing lifecycle tests**

```python
def test_delete_closes_connection_and_removes_temp_directory(registry):
    session = registry.create()
    temp_dir = session.temp_dir
    registry.delete(session.id)
    assert not temp_dir.exists()
    assert registry.get_optional(session.id) is None

def test_expire_idle_removes_only_stale_sessions(registry, clock):
    stale = registry.create()
    fresh = registry.create()
    stale.last_accessed = clock.now() - timedelta(seconds=3601)
    registry.expire_idle()
    assert registry.get_optional(stale.id) is None
    assert registry.get(fresh.id).id == fresh.id
```

- [ ] **Step 2: Write failing intake tests**

```python
async def test_load_csv_registers_only_dataset_table(session, csv_upload):
    metadata = await load_csv(session, csv_upload, max_bytes=1024)
    assert metadata.row_count == 3
    assert session.connection.execute("show tables").fetchall() == [("dataset",)]

async def test_load_csv_rejects_oversized_stream_without_registration(session, upload_factory):
    upload = upload_factory(b"a" * 1025)
    with pytest.raises(AppError, match="CSV exceeds 1.0 KB"):
        await load_csv(session, upload, max_bytes=1024)
    assert session.connection.execute("show tables").fetchall() == []
```

- [ ] **Step 3: Run tests and confirm missing implementations**

Run: `python -m pytest backend/tests/test_sessions.py backend/tests/test_intake.py -v`

Expected: FAIL during import.

- [ ] **Step 4: Implement session ownership**

```python
@dataclass
class Session:
    id: str
    temp_dir: Path
    connection: duckdb.DuckDBPyConnection
    lock: asyncio.Lock
    last_accessed: datetime
    profile: DatasetProfile | None = None
    runs: dict[str, AnalysisRun] = field(default_factory=dict)

class SessionRegistry:
    def create(self) -> Session: ...
    def get(self, session_id: str) -> Session: ...
    def delete(self, session_id: str) -> None: ...
    def expire_idle(self) -> int: ...
    def close_all(self) -> None: ...
```

Create each DuckDB connection with external access and automatic extension loading disabled. Use UUID4 session IDs and one `TemporaryDirectory` per session.

- [ ] **Step 5: Implement bounded upload and registration**

Read `UploadFile` in 1 MB chunks, fail as soon as the limit is crossed, detect UTF-8/UTF-8-SIG/GB18030 with `charset-normalizer`, and create `dataset` through parameterized DuckDB file access owned by the intake layer. Drop any previous `dataset` only after the replacement file validates successfully.

- [ ] **Step 6: Run tests and commit**

Run: `python -m pytest backend/tests/test_sessions.py backend/tests/test_intake.py -v`

Expected: PASS.

```bash
git add backend/src/proofquery/sessions.py backend/src/proofquery/intake.py backend/tests
git commit -m "feat: add ephemeral CSV sessions"
```

### Task 3: Structured Data Profiling

**Files:**
- Create: `backend/src/proofquery/profiler.py`
- Create: `backend/tests/test_profiler.py`

**Interfaces:**
- Consumes: a registered `Session.connection` containing `dataset`.
- Produces: `profile_dataset(session) -> DatasetProfile` with column type, null count/rate, distinct count, numeric/date range, capped samples, warnings, row count, and suggested questions.

- [ ] **Step 1: Write failing profile tests**

```python
def test_profile_reports_quality_ranges_and_capped_samples(session_with_sales):
    profile = profile_dataset(session_with_sales)
    revenue = next(column for column in profile.columns if column.name == "revenue")
    assert profile.row_count == 4
    assert revenue.null_count == 1
    assert revenue.minimum == 10.0
    assert revenue.maximum == 30.0
    assert len(revenue.samples) <= 5

def test_profile_truncates_long_values_before_model_context(session_with_long_text):
    profile = profile_dataset(session_with_long_text)
    assert max(len(str(value)) for value in profile.columns[0].samples) <= 120
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `python -m pytest backend/tests/test_profiler.py -v`

Expected: FAIL because `profile_dataset` does not exist.

- [ ] **Step 3: Implement profiling with quoted identifiers**

Use DuckDB metadata for physical types and one aggregate query per column for nulls, distinct values, min/max, and five representative non-null values. Quote identifiers through a dedicated `quote_identifier(name: str) -> str` helper and never concatenate data values into SQL.

Generate deterministic suggestions from available types: distribution for categoricals, trend for dates plus numerics, top values for categoricals, and data-quality review when nulls exist.

- [ ] **Step 4: Run tests and commit**

Run: `python -m pytest backend/tests/test_profiler.py -v`

Expected: PASS.

```bash
git add backend/src/proofquery/profiler.py backend/tests/test_profiler.py
git commit -m "feat: profile uploaded datasets"
```

### Task 4: SQL Policy And Bounded Query Execution

**Files:**
- Create: `backend/src/proofquery/sql_policy.py`
- Create: `backend/src/proofquery/query.py`
- Create: `backend/tests/test_sql_policy.py`
- Create: `backend/tests/test_query.py`

**Interfaces:**
- Consumes: SQL text and a session containing `dataset`.
- Produces: `validate_sql(sql) -> str` and `execute_query(session, sql, settings) -> QueryResult`.

- [ ] **Step 1: Write the security matrix before implementation**

```python
@pytest.mark.parametrize("sql", [
    "delete from dataset",
    "select 1; select 2",
    "copy dataset to 'leak.csv'",
    "select * from read_csv_auto('other.csv')",
    "install httpfs",
    "load httpfs",
    "attach 'other.db' as other",
    "pragma version",
    "with changed as (delete from dataset returning *) select * from changed",
    "select * from information_schema.tables",
])
def test_policy_rejects_non_read_only_or_external_sql(sql):
    with pytest.raises(AppError, match="read-only"):
        validate_sql(sql)

@pytest.mark.parametrize("sql", [
    "select region, sum(revenue) as total from dataset group by region",
    "with totals as (select sum(revenue) total from dataset) select * from totals",
])
def test_policy_accepts_bounded_dataset_selects(sql):
    assert validate_sql(sql).startswith(("SELECT", "WITH"))
```

- [ ] **Step 2: Run tests and verify failure**

Run: `python -m pytest backend/tests/test_sql_policy.py backend/tests/test_query.py -v`

Expected: FAIL during import.

- [ ] **Step 3: Implement SQLGlot validation**

Parse exactly one DuckDB-dialect statement. Require a `Select` root or a `With` whose result is a `Select`. Walk the AST and reject insert/update/delete/merge/create/drop/alter/copy/command/pragma/attach nodes, table functions, file paths, and every table except unqualified `dataset` or CTE aliases defined inside the statement.

- [ ] **Step 4: Implement row and time bounds**

Wrap validated SQL as `SELECT * FROM (<validated>) AS proofquery_result LIMIT 501`, run it under the session lock, and call `connection.interrupt()` when `asyncio.wait_for` reaches 10 seconds. Return at most 500 rows and set `truncated=True` when row 501 exists. Convert DuckDB values to JSON-safe scalars without exposing file paths or engine exception text.

- [ ] **Step 5: Run policy tests and commit**

Run: `python -m pytest backend/tests/test_sql_policy.py backend/tests/test_query.py -v`

Expected: PASS, including timeout, truncation, and concurrent-lock tests.

```bash
git add backend/src/proofquery/sql_policy.py backend/src/proofquery/query.py backend/tests
git commit -m "feat: enforce read-only bounded queries"
```

### Task 5: Evidence Rules And Responses Agent

**Files:**
- Create: `backend/src/proofquery/evidence.py`
- Create: `backend/src/proofquery/agent.py`
- Create: `backend/tests/test_evidence.py`
- Create: `backend/tests/test_agent.py`

**Interfaces:**
- Consumes: `DatasetProfile`, user question, conversation summary, `execute_query`, and an injected Responses client.
- Produces: `EvidenceBuilder.finalize(...) -> Answer` and `AnalysisAgent.run(session, question, emit) -> Answer`.

- [ ] **Step 1: Write deterministic evidence tests**

```python
def test_numeric_answer_requires_distinct_supporting_verification():
    builder = EvidenceBuilder()
    answer = builder.finalize(
        conclusion="Revenue was 100.",
        primary=QueryEvidence(sql="select sum(revenue) total from dataset", result=query_result(100)),
        verification=QueryEvidence(sql="select sum(region_total) from (select region, sum(revenue) region_total from dataset group by region)", result=query_result(100)),
        numeric_claims=[100],
    )
    assert answer.evidence.status == VerificationStatus.VERIFIED

def test_same_sql_or_mismatched_value_is_uncertain():
    builder = EvidenceBuilder()
    answer = builder.finalize(
        conclusion="Revenue was 100.",
        primary=QueryEvidence(sql="select sum(revenue) from dataset", result=query_result(100)),
        verification=QueryEvidence(sql="select sum(revenue) from dataset", result=query_result(99)),
        numeric_claims=[100],
    )
    assert answer.evidence.status == VerificationStatus.UNCERTAIN
    assert answer.limitations
```

The test helper `query_result(value)` returns `QueryResult(columns=["value"], rows=[[value]], row_count=1, duration_ms=1)`.

- [ ] **Step 2: Write a fake-client tool-loop test**

```python
async def test_agent_executes_schema_query_chart_and_verification(fake_responses, session):
    agent = AnalysisAgent(client=fake_responses, settings=test_settings)
    events = []
    answer = await agent.run(session, "按地区比较收入", events.append)
    assert [event.stage for event in events] == ["planning", "querying", "charting", "verifying", "complete"]
    assert answer.evidence.status == "verified"
    assert fake_responses.complete_csv_was_never_sent
```

- [ ] **Step 3: Run tests and verify failure**

Run: `python -m pytest backend/tests/test_evidence.py backend/tests/test_agent.py -v`

Expected: FAIL during import.

- [ ] **Step 4: Implement the four tool schemas and one-repair loop**

Define strict JSON schemas for `get_schema`, `run_query`, `create_chart`, and `verify_result`. Inject the OpenAI client so tests use `FakeResponsesClient`. Call `responses.create` with server instructions, the compact profile, conversation summary, and tools. Execute returned function calls locally, append `function_call_output` items, and stop after a final structured answer or one repaired failure.

The chart tool accepts only `bar`, `line`, `area`, `point`, or `arc`; it references returned column names and cannot embed URLs, HTML, expressions, or arbitrary Vega signals.

- [ ] **Step 5: Enforce privacy and uncertainty in finalization**

Create model context through `build_agent_context(profile, question, history)`, cap it to five samples per column and 120 characters per value, and never include the dataset path or full rows. Derive verification status in application code; do not trust a model-provided status string.

- [ ] **Step 6: Run tests and commit**

Run: `python -m pytest backend/tests/test_evidence.py backend/tests/test_agent.py -v`

Expected: PASS.

```bash
git add backend/src/proofquery/evidence.py backend/src/proofquery/agent.py backend/tests
git commit -m "feat: add evidence-backed analysis agent"
```

### Task 6: FastAPI Lifecycle, Routes, And Event Streaming

**Files:**
- Create: `backend/src/proofquery/app.py`
- Create: `backend/tests/test_api.py`

**Interfaces:**
- Consumes: session registry, intake, profiler, and analysis agent.
- Produces: the exact REST and server-sent event endpoints in the design specification.

- [ ] **Step 1: Write the upload-to-profile API test**

```python
async def test_create_upload_profile_and_delete(client):
    session = (await client.post("/api/sessions")).json()
    response = await client.post(
        f"/api/sessions/{session['id']}/dataset",
        files={"file": ("sales.csv", b"region,revenue\nEast,10\nWest,20\n", "text/csv")},
    )
    assert response.status_code == 200
    assert response.json()["row_count"] == 2
    assert (await client.delete(f"/api/sessions/{session['id']}")).status_code == 204
```

- [ ] **Step 2: Write run and stable-error tests**

Test that `POST /questions` returns `202` and a run ID, SSE emits ordered stages and a final answer, unknown sessions return `SESSION_NOT_FOUND`, oversized files return `CSV_TOO_LARGE`, and `/api/health` never returns model names, keys, prompts, or paths.

- [ ] **Step 3: Run tests and verify failure**

Run: `python -m pytest backend/tests/test_api.py -v`

Expected: FAIL because the FastAPI app does not exist.

- [ ] **Step 4: Implement lifespan and routes**

Create one registry and one agent in FastAPI lifespan. Start a periodic idle-session cleanup task and cancel it on shutdown, then call `registry.close_all()`. Convert `AppError` to the stable JSON error schema. Run analysis in an application task that writes `RunEvent` objects into an in-memory queue retained with the session.

SSE uses `event: progress|answer|error` and JSON `data:` lines, sends a heartbeat every 15 seconds, replays retained events to reconnecting clients, and closes after the terminal event.

- [ ] **Step 5: Run tests and commit**

Run: `python -m pytest backend/tests -v`

Expected: PASS without `OPENAI_API_KEY` because API tests inject the fake Agent.

```bash
git add backend/src/proofquery/app.py backend/tests/test_api.py
git commit -m "feat: expose ProofQuery API"
```

### Task 7: Workspace Shell, Upload, And Dataset Profile

**Files:**
- Create: `frontend/src/api.ts`
- Create: `frontend/src/state.ts`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/components/DatasetDropzone.tsx`
- Create: `frontend/src/components/DatasetPanel.tsx`
- Create: `frontend/src/components/MobileTabs.tsx`
- Create: `frontend/src/styles.css`
- Create: `frontend/src/App.test.tsx`
- Create: `frontend/src/components/DatasetDropzone.test.tsx`

**Interfaces:**
- Consumes: session and dataset API contracts.
- Produces: an accessible responsive workspace in `empty`, `uploading`, `ready`, and `error` states.

- [ ] **Step 1: Write the empty and upload-state tests**

```tsx
it('uploads one CSV and reveals its profile', async () => {
  render(<App api={fakeApi} />)
  await userEvent.upload(screen.getByLabelText('选择 CSV 文件'), csvFile)
  expect(await screen.findByText('3 行')).toBeVisible()
  expect(screen.getByRole('heading', { name: '字段' })).toBeVisible()
  expect(screen.getByRole('textbox', { name: '分析问题' })).toBeEnabled()
})

it('rejects a second file before making a request', async () => {
  render(<DatasetDropzone onUpload={onUpload} />)
  await userEvent.upload(screen.getByLabelText('选择 CSV 文件'), [firstCsv, secondCsv])
  expect(screen.getByText('一次只能分析一个 CSV')).toBeVisible()
  expect(onUpload).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm --prefix frontend test -- --run`

Expected: FAIL because the application components do not exist.

- [ ] **Step 3: Implement reducer and typed client**

Use a discriminated `WorkspaceState` with `booting`, `empty`, `uploading`, `ready`, and `failed` variants. `createSession`, `uploadDataset`, `askQuestion`, `streamRun`, and `deleteSession` parse non-2xx responses into a typed `ApiError`.

- [ ] **Step 4: Implement the usable first screen**

Render the ProofQuery product name in the header, a compact drop zone in the primary workspace, a 50 MB and session-only data note, and no marketing hero. After upload, render the dataset rail, the conversation region, and disabled evidence drawer trigger. Use Lucide icons for upload, reset, database, table, warning, and menu actions with accessible labels and tooltips.

- [ ] **Step 5: Implement responsive layout tokens**

Define stable desktop columns `280px minmax(420px, 1fr) 360px`, a tablet evidence drawer below 1180 px, and tabbed single-column mobile layout below 720 px. Use maximum 8 px radii, zero letter spacing, fixed 40 px icon controls, visible focus rings, and no viewport-scaled typography.

- [ ] **Step 6: Run tests and commit**

Run: `npm --prefix frontend test -- --run`

Expected: PASS.

Run: `npm --prefix frontend run build`

Expected: PASS.

```bash
git add frontend/src frontend/package.json frontend/vite.config.ts
git commit -m "feat: build CSV workspace shell"
```

### Task 8: Conversation, Charts, And Evidence Drawer

**Files:**
- Create: `frontend/src/components/QuestionComposer.tsx`
- Create: `frontend/src/components/Conversation.tsx`
- Create: `frontend/src/components/AnswerBlock.tsx`
- Create: `frontend/src/components/ChartView.tsx`
- Create: `frontend/src/components/EvidenceDrawer.tsx`
- Create: `frontend/src/components/Conversation.test.tsx`
- Create: `frontend/src/components/EvidenceDrawer.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/state.ts`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: `RunEvent`, `Answer`, `ChartSpec`, and the run API methods.
- Produces: streamed progress, final answer rendering, validated Vega-Lite charts, and inspectable evidence.

- [ ] **Step 1: Write progress and verification tests**

```tsx
it('shows ordered progress and a verified answer', async () => {
  render(<Conversation state={runningState} dispatch={dispatch} />)
  expect(screen.getByText('正在规划分析')).toBeVisible()
  emit({ type: 'progress', stage: 'querying', message: '正在执行只读查询' })
  emit(verifiedAnswerEvent)
  expect(await screen.findByText('已验证')).toBeVisible()
  expect(screen.getByRole('button', { name: '查看证据' })).toBeEnabled()
})

it('labels failed verification without definitive styling', () => {
  render(<AnswerBlock answer={uncertainAnswer} onEvidence={noop} />)
  expect(screen.getByText('结果存在不确定性')).toBeVisible()
  expect(screen.queryByText('已验证')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm --prefix frontend test -- --run`

Expected: FAIL because conversation components do not exist.

- [ ] **Step 3: Implement conversation and composer states**

Keep the composer fixed within the analysis column without covering answers. Disable send for blank questions and while a run is active. Render suggested questions as commands above the composer, not persistent decorative cards. Preserve user questions, progress stages, answer blocks, and errors in reducer state.

- [ ] **Step 4: Implement safe chart rendering**

Map the backend chart contract to a local Vega-Lite spec. Allow only named fields present in `answer.evidence.primary.result.columns`, fixed mark names, local inline values, and title/axis strings. Do not pass backend objects directly to `vegaEmbed` until validation succeeds; render a compact table fallback when it fails.

- [ ] **Step 5: Implement evidence inspection**

Show status, primary SQL, verification SQL, duration, row count, truncation, and limitations. Use copy icons for SQL with `aria-label`, a close icon for the drawer, code blocks that scroll horizontally, and no raw model trace or hidden prompt content.

- [ ] **Step 6: Run tests and commit**

Run: `npm --prefix frontend test -- --run`

Expected: PASS.

Run: `npm --prefix frontend run build`

Expected: PASS.

```bash
git add frontend/src
git commit -m "feat: render verified analysis evidence"
```

### Task 9: End-To-End Workflow And Operational Documentation

**Files:**
- Create: `sample-data/sales.csv`
- Create: `frontend/e2e/proofquery.spec.ts`
- Create: `frontend/playwright.config.ts`
- Create: `README.md`
- Modify: `backend/tests/test_api.py`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: the complete backend and frontend.
- Produces: repeatable local startup, a deterministic sample flow, desktop/mobile browser coverage, and documented configuration.

- [ ] **Step 1: Add a deterministic sample dataset and browser test**

```ts
test('upload, analyze, and inspect evidence', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('选择 CSV 文件').setInputFiles('../sample-data/sales.csv')
  await expect(page.getByText('6 行')).toBeVisible()
  await page.getByRole('textbox', { name: '分析问题' }).fill('按地区比较收入')
  await page.getByRole('button', { name: '发送问题' }).click()
  await expect(page.getByText('已验证')).toBeVisible()
  await page.getByRole('button', { name: '查看证据' }).click()
  await expect(page.getByRole('heading', { name: '验证查询' })).toBeVisible()
})
```

Serve deterministic fake-Agent responses for default browser tests. Add a mobile project at 390 x 844 and assert Dataset, Analysis, and Evidence tabs switch without horizontal document overflow.

- [ ] **Step 2: Run the end-to-end test and verify any wiring failures**

Run: `npm --prefix frontend run test:e2e`

Expected before final wiring: FAIL at the first missing proxy, route, or selector.

- [ ] **Step 3: Complete local development wiring**

Configure Vite to proxy `/api` to `http://127.0.0.1:8000`, add the test fake-Agent dependency override to FastAPI, and make Playwright start both servers. Fix only the observed wiring failures until the deterministic desktop and mobile flows pass.

- [ ] **Step 4: Write README operations and security guidance**

Document Python and Node prerequisites, environment variable names, backend and frontend start commands, sample CSV usage, session cleanup behavior, data sent to OpenAI, query restrictions, test commands, and the optional live smoke-test command. Do not include a real API key or a default model name.

- [ ] **Step 5: Run the full verification matrix**

Run: `python -m pytest backend/tests -v`

Expected: PASS.

Run: `npm --prefix frontend test -- --run`

Expected: PASS.

Run: `npm --prefix frontend run build`

Expected: PASS.

Run: `npm --prefix frontend run test:e2e`

Expected: PASS for desktop and mobile projects.

- [ ] **Step 6: Commit the completed MVP**

```bash
git add README.md sample-data frontend backend
git commit -m "test: verify ProofQuery user workflow"
```

### Task 10: Live Visual And API Smoke Verification

**Files:**
- Modify only files implicated by observed failures.

**Interfaces:**
- Consumes: a locally running application and optional user-provided environment credentials already present in the project environment.
- Produces: verified desktop/mobile rendering, clean browser console, and optional confirmation that the real Responses API tool loop works.

- [ ] **Step 1: Start the local application**

Run backend: `python -m uvicorn proofquery.app:app --app-dir backend/src --host 127.0.0.1 --port 8000`

Run frontend: `npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173`

Expected: both health endpoint and workspace load successfully.

- [ ] **Step 2: Inspect desktop and mobile screenshots**

Use browser automation at 1440 x 900 and 390 x 844. Verify the first screen is usable, the upload region is visible, the next content is hinted without a marketing hero, controls have stable dimensions, text does not overlap, the chart is nonblank, evidence is reachable, and mobile tabs do not produce horizontal overflow.

- [ ] **Step 3: Check console and network behavior**

Verify no uncaught browser errors, no failed static assets, no API key/model values in responses, and no raw CSV content in Agent-request debug logs. Confirm reset deletes the session and returns the workspace to its empty state.

- [ ] **Step 4: Run the optional live analysis smoke test**

Only when `OPENAI_API_KEY` and `OPENAI_MODEL` are already available, upload `sample-data/sales.csv`, ask `按地区比较收入`, and verify that a primary query, distinct verification query, chart/table, and status return. If credentials are absent, record the live smoke test as skipped; do not block the deterministic suites.

- [ ] **Step 5: Fix observed defects test-first and commit**

For each defect, add the smallest failing backend, component, or browser regression test, run it to confirm failure, make the minimal fix, rerun the focused test, then rerun the full matrix.

```bash
git add backend frontend README.md
git commit -m "fix: polish verified local workflow"
```
