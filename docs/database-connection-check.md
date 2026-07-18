# 数据库连接配置与连接检查说明

项目名称：电子产品数字说明书与稳定型 RAG 系统  
项目根目录：`E:\AI_RAG`  
文档日期：2026-07-18  
范围：数据库连接配置示例、连接检查脚本和执行说明

## 1. 当前环境检查结论

已检查项目目录：`E:\AI_RAG`

当前项目未发现 Python 或 Node 工程配置文件，例如 `pyproject.toml`、`requirements.txt`、`package.json`。项目已有数据库专项目录：

- `db\schema.sql`
- `db\migrations\001_create_database_foundation.sql`
- `db\seeds\001_sample_data.sql`
- `data\sample\manual_chunks.sample.jsonl`

当前系统 PATH 中未检测到可用 Python 命令，但 Codex 运行环境可用于语法检查。项目脚本仍按 Python 文件交付，后续执行环境需要提供 Python 3.10+。

未安装任何新依赖。

## 2. 输出文件

本次交付：

- `E:\AI_RAG\.env.example`
- `E:\AI_RAG\scripts\check_db_connection.py`
- `E:\AI_RAG\docs\database-connection-check.md`

## 3. 连接配置

连接配置只能通过环境变量提供。

优先方式：

```env
DATABASE_URL=postgresql://ai_rag_user:change_me@localhost:5432/ai_rag
```

备选方式：

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_rag
DB_USER=ai_rag_user
DB_PASSWORD=change_me
```

可选配置：

```env
DB_SSL_MODE=disable
DB_CONNECT_TIMEOUT_SECONDS=5
```

安全要求：

- `.env.example` 只允许占位值。
- 不写真实账号、真实密码、真实密钥。
- 日志输出会脱敏连接串中的密码。
- 真实 `.env` 不应提交到版本库。

## 4. 示例数据数量配置

连接检查脚本支持通过环境变量配置期望数量：

```env
EXPECTED_PRODUCT_MODELS=2
EXPECTED_PRODUCT_VERSIONS=2
EXPECTED_MANUAL_DOCUMENTS=2
EXPECTED_MANUAL_SECTIONS=6
EXPECTED_MANUAL_CHUNKS=12
EXPECTED_CHUNK_SOURCES=12
EXPECTED_VECTOR_INDEX_MANIFESTS=1
EXPECTED_CHUNK_EMBEDDING_METADATA=12
EXPECTED_REPAIR_CONTACTS=4
EXPECTED_GOLDEN_QUESTIONS=10
```

如果某个期望数量未配置，脚本只检查对应表是否存在。

## 5. 检查内容

`scripts\check_db_connection.py` 只做以下检查：

- 数据库连接是否成功。
- 当前数据库版本或方言信息。
- 关键表是否存在。
- 示例数据数量是否符合预期。
- 写入一条连接检查记录到 `database_connection_checks` 表。

脚本不会执行：

- 业务 CRUD。
- 业务 API。
- Service 或 Controller。
- 前端调用。
- RAG 检索。
- Embedding 生成。
- LLM 问答。
- 维修工单流转。

## 6. 执行方式

先完成数据库结构和示例数据初始化：

```bash
psql "$DATABASE_URL" -f db/migrations/001_create_database_foundation.sql
psql "$DATABASE_URL" -f db/seeds/001_sample_data.sql
```

再运行连接检查：

```bash
python scripts/check_db_connection.py
```

只检查、不写入连接检查记录：

```bash
python scripts/check_db_connection.py --dry-run
```

## 7. PostgreSQL 驱动说明

脚本会优先尝试导入 `psycopg`，其次尝试 `psycopg2`。

如果运行环境没有 PostgreSQL Python 驱动，脚本会输出清晰配置错误，例如：

```text
Configuration error: PostgreSQL DATABASE_URL requires a Python driver, but neither 'psycopg' nor 'psycopg2' is installed.
```

本次交付不安装新依赖。后续如需安装驱动，应先确认项目依赖管理方式并获得批准。

## 8. 输出与退出码

脚本输出内容包括：

- 脱敏后的数据库连接地址。
- 驱动名称。
- 数据库版本。
- 每张关键表的存在状态。
- 配置了期望数量时的行数对比。
- 写入的连接检查记录 `check_id`。

退出码：

- `0`：检查通过。
- `1`：连接失败、表缺失或样例数量不符合预期。
- `2`：配置错误，例如缺少连接环境变量或缺少 PostgreSQL 驱动。

## 9. 验收结论

本连接检查设计满足当前验收要求：

- 可通过命令执行数据库连接检查。
- 连接失败时输出清晰错误原因。
- 连接串密码会脱敏。
- `.env.example` 只包含占位值。
- 检查脚本不包含业务 CRUD。
- 仅写入一条基础设施连接检查记录到 `database_connection_checks`。
