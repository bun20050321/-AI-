# ProofQuery MVP Design

Date: 2026-07-18

## Product Goal

ProofQuery is a local, single-user CSV analysis workspace. A user uploads one CSV, asks questions in natural language, and receives a concise answer backed by a chart or table, the executed SQL, and an independent verification result.

The MVP succeeds when a user can move from an unfamiliar CSV to a traceable answer without writing SQL, while the application prevents writes, external data access, and unsupported certainty.

## Confirmed Scope

- One CSV per session, up to 50 MB.
- One local user with no account or permissions system.
- Session data is ephemeral and removed when the service stops.
- OpenAI Responses API drives the analysis Agent.
- DuckDB executes read-only local analysis.
- Chinese and English questions are supported.
- Every numeric conclusion links to query evidence and a separate verification query.

The MVP does not include multiple datasets, joins, saved history, collaboration, deployment, scheduled reports, spreadsheet editing, or non-CSV sources.

## Approaches Considered

### React + FastAPI + DuckDB (selected)

This separates the polished interactive workspace from the data and Agent runtime. Python has the most mature DuckDB and data-profiling support, while React provides predictable responsive behavior for chat, evidence panels, tables, and charts. The cost is maintaining two small applications, but the boundaries remain clear.

### Next.js full stack + DuckDB for Node

This would reduce the project to one language and one development server. The Node DuckDB ecosystem and query interruption behavior are less mature for this workload, so the data safety and profiling layer would require more custom work.

### Streamlit + Python

This would produce the fastest technical prototype. It would make the evidence workspace, streaming conversation, responsive navigation, and durable interaction states harder to polish. It is better suited to an internal demo than the intended product-quality MVP.

## User Experience

The first screen is the usable workspace, not a landing page. Before upload, the center area contains a compact CSV drop zone and the privacy/size constraints. After upload, the workspace becomes:

- A narrow dataset rail with file metadata, schema, quality signals, and sample controls.
- A primary conversation area with questions, execution progress, answers, charts, and compact tables.
- An evidence drawer containing the main SQL, verification SQL, returned row counts, timing, and validation status.
- A fixed composer at the bottom with a send command and one-click suggested questions derived from the profile.

Desktop uses a stable three-region layout. Tablet collapses the evidence area into a drawer. Mobile exposes Dataset, Analysis, and Evidence as tabs so content never overlaps or shrinks below a usable width.

The visual language is quiet and operational: off-white surfaces, graphite text, blue actions, green verified states, and amber uncertainty. Cards are reserved for repeated answers and modal content; major page regions remain unframed.

## System Architecture

```text
React workspace
    |  multipart upload / JSON / streamed events
FastAPI application
    |-- Session registry and temporary-file lifecycle
    |-- CSV intake and profiler
    |-- Analysis Agent orchestrator
    |-- Tool policy and SQL safety layer
    |-- Evidence and verification builder
    |
DuckDB in-process connection        OpenAI Responses API
    |                               |
read-only dataset table             schema, samples, aggregates,
and verification queries            tool results, conversation context
```

The browser never receives the OpenAI API key. The backend reads `OPENAI_API_KEY` and `OPENAI_MODEL` from environment variables. No model name is hard-coded because model availability changes over time.

## Backend Components

### Session Registry

Creates an opaque session ID, owns its temporary directory and DuckDB connection, and serializes queries with a per-session lock. A shutdown hook closes connections and removes every temporary file. Sessions also expire after 60 minutes of inactivity.

### CSV Intake

Streams the upload to a temporary file while enforcing the 50 MB limit. It rejects empty files, unsupported encodings, malformed rows, and files whose detected structure cannot be read consistently. The accepted CSV is registered as a single table named `dataset`; user-provided file or column names are never interpolated into SQL.

### Data Profiler

Produces a structured schema containing inferred types, null rates, distinct counts, numeric ranges, date ranges, and short representative samples. If type inference conflicts, the column remains text and is marked for clarification. Samples are capped and truncated before any model request.

### Analysis Agent

Uses the OpenAI Responses API with a system contract and four application tools:

1. `get_schema`: returns the structured data profile.
2. `run_query`: validates and executes one bounded read-only query.
3. `create_chart`: validates a declarative chart specification against returned columns.
4. `verify_result`: executes a distinct validation query and compares its evidence with the primary result.

The Agent receives the question, conversation summary, schema, capped samples, and tool outputs. It never receives the full CSV. It may repair one failed tool call. A second failure becomes a clear user-facing limitation rather than an execution loop.

### SQL Safety Layer

SQL is parsed as an abstract syntax tree before execution. Only one `SELECT` statement or a `WITH` query ending in `SELECT` is accepted. The policy rejects mutations, file functions, extension loading, external scans, pragmas, attach/copy/export operations, and references outside the `dataset` table. Results are limited to 500 rows, and the connection is interrupted after 10 seconds.

DuckDB external access, unsigned extensions, automatic extension installation, and automatic extension loading are disabled. Raw database errors stay in server logs; the Agent receives a bounded machine-readable error code and repair hint.

### Evidence Builder

Each answer is stored in memory as a structured object with a conclusion, limitations, primary query, primary result summary, optional chart specification, verification query, verification result, and status. A numeric answer cannot receive `verified` status until the secondary query completes and supports the same claim through a different aggregation or reconciliation path.

If verification fails or is inconclusive, the UI labels the answer as uncertain and the narrative must avoid definitive numeric language.

## Data Flow

1. The browser uploads one CSV.
2. Intake validates and registers it as `dataset`.
3. The profiler returns schema and quality signals to the workspace.
4. The user asks a question.
5. The Agent inspects the schema and creates a tool plan.
6. The policy layer validates and executes the primary SQL.
7. The Agent optionally creates a chart from the bounded result.
8. A distinct verification query runs and is compared with the primary evidence.
9. The backend streams progress, then returns a structured evidence-backed answer.
10. The UI renders the conclusion first and keeps SQL and detailed traces available in the evidence drawer.

## API Surface

- `POST /api/sessions`: create an ephemeral session.
- `POST /api/sessions/{id}/dataset`: upload and profile a CSV.
- `GET /api/sessions/{id}/dataset`: retrieve the current profile.
- `POST /api/sessions/{id}/questions`: start an analysis run.
- `GET /api/sessions/{id}/runs/{run_id}/events`: stream status and answer events.
- `DELETE /api/sessions/{id}`: clear the current session immediately.
- `GET /api/health`: report process health without exposing configuration or secrets.

Errors use a stable `{code, message, details}` shape. User-facing messages explain the next action without exposing prompts, keys, file paths, or raw SQL engine output.

## Frontend Components

- `AppShell`: responsive workspace regions and session lifecycle.
- `DatasetDropzone`: upload validation, progress, and reset.
- `DatasetPanel`: schema, quality signals, and representative values.
- `Conversation`: questions, progress timeline, and answer history.
- `QuestionComposer`: text input, send state, and suggested questions.
- `AnswerBlock`: conclusion, limitations, chart or table, and verification badge.
- `EvidenceDrawer`: primary SQL, verification SQL, timings, row counts, and status.
- `ChartView`: renders only validated chart specifications through Vega-Lite.

The frontend treats backend answer objects as data, not HTML. Markdown rendering disallows raw HTML and unsafe links.

## Failure Handling

- Invalid or oversized CSV: reject before registration and preserve the empty workspace.
- Conflicting column types: keep text and display a quality warning.
- Ambiguous question or missing field: ask one necessary clarification inside the conversation.
- Unsafe SQL: block before DuckDB execution and allow one Agent repair.
- Timeout or oversized result: return a bounded error and suggest narrowing the question.
- OpenAI unavailable or misconfigured: keep profiling available and explain that natural-language analysis is temporarily unavailable.
- Verification failure: show the evidence, mark the conclusion uncertain, and do not fabricate a replacement value.
- Browser disconnect during a run: keep the in-memory run until session expiry so the client can reconnect to the event stream.

## Testing Strategy

Backend unit tests cover CSV validation, profiler edge cases, SQL policy bypass attempts, result limits, timeouts, evidence status rules, and cleanup. Agent tests use a fake Responses client with deterministic tool-call sequences. Integration tests exercise upload-to-answer flows against temporary DuckDB databases.

Frontend component tests cover upload states, responsive navigation, answer rendering, evidence visibility, and error states. Browser tests cover the primary desktop and mobile workflows with a fake backend, plus one opt-in live API smoke test when credentials are present.

Security regression tests include stacked statements, comments, CTE mutations, table functions, path scans, extension commands, encoded identifiers, huge results, and prompt requests that attempt to bypass the tool policy.

## Acceptance Criteria

- A valid CSV up to 50 MB produces a profile and suggested questions.
- A user can ask a question and see progress without reloading the page.
- A completed answer includes a conclusion and evidence; numeric conclusions also include a distinct verification query and status.
- Unsafe or non-read-only SQL never reaches DuckDB execution.
- The full CSV and API key never appear in OpenAI requests, browser responses, logs, or error messages.
- Resetting or expiring a session removes its temporary file and closes its database connection.
- Desktop and mobile layouts keep controls and content readable without overlap.
- The core test suites pass without requiring an OpenAI API key.
