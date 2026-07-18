# ProofQuery

ProofQuery is a local, single-user CSV analysis workspace. It profiles one CSV, turns natural-language questions into bounded read-only DuckDB queries, and presents each answer with its primary SQL, an independent verification query, and an explicit verification status.

## Requirements

- Python 3.12
- Node.js 20 or newer
- An OpenAI API key and a Responses API model available to your account

## Install

From the repository root:

```powershell
python -m pip install -e "backend[dev]"
npm.cmd --prefix frontend install
Copy-Item .env.example .env
```

Set both values in `.env`:

```dotenv
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=your-model-id
```

No model name is committed as a default because model availability changes over time.

## Run Locally

Start the API in one terminal:

```powershell
python -m uvicorn proofquery.app:app --app-dir backend/src --host 127.0.0.1 --port 8000
```

Start the workspace in another terminal:

```powershell
npm.cmd --prefix frontend run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173`. `sample-data/sales.csv` is available for a quick local analysis.

If `python` is not on `PATH` on Windows, use the full interpreter path or set a `PYTHON` environment variable before running browser tests:

```powershell
$env:PYTHON = "C:\path\to\python.exe"
```

## Data And Security Boundaries

- One CSV is accepted per session, up to 50 MB.
- Uploaded files, profiles, conversation state, and query results are temporary. They are removed when the session expires, is reset, or the API stops.
- The browser never receives the OpenAI API key.
- OpenAI receives only the schema, at most five truncated representative values per column, aggregate query results, and recent conversation context. The complete CSV and its local path are not sent.
- SQL is parsed before execution. Only one `SELECT` statement against the fixed `dataset` table and local CTEs is allowed.
- DuckDB extension loading and external access are disabled after CSV registration.
- Query results are limited to 500 rows and execution is interrupted after 10 seconds.
- Numeric answers are marked verified only when a distinct verification query supports the same claim.

## Tests

Run deterministic backend tests without an API key:

```powershell
python -m pytest backend/tests -v
```

Run frontend component tests and a production build:

```powershell
npm.cmd --prefix frontend test -- --run
npm.cmd --prefix frontend run build
```

Run desktop and mobile browser workflows. These use a deterministic test Agent but exercise the real upload, profiling, SQL, chart, evidence, and responsive UI layers:

```powershell
npm.cmd --prefix frontend run test:e2e
```

Live OpenAI verification is intentionally separate from the deterministic suite. With `OPENAI_API_KEY` and `OPENAI_MODEL` configured, run the application and analyze `sample-data/sales.csv` through the browser.
