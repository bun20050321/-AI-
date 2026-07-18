# 数据库初始化、验证与交付指南

项目名称：电子产品数字说明书与稳定型 RAG 系统  
项目根目录：`E:\AI_RAG`  
文档日期：2026-07-18  
阶段定位：数据库基础专项交付

## 1. 交付边界

本阶段只完成数据库基础能力：

- 数据库专项范围说明。
- 数据库环境与技术栈确认。
- 数据库概念模型与 ER 关系。
- PostgreSQL 物理表结构和初始化 DDL。
- 非敏感示例数据。
- 数据库连接配置示例。
- 数据库连接检查脚本。
- 初始化、验证和交付说明。

本阶段不包含：

- 业务 CRUD。
- 业务 API。
- 前端页面。
- RAG 检索。
- Embedding 生成。
- LLM 问答。
- 维修申请、工单流转或状态变更业务。

## 2. 前置条件

初始化前请确认：

- 已安装 PostgreSQL 13+。
- 数据库服务已启动。
- 已有可连接 PostgreSQL 的数据库用户。
- 该用户具备建表、建索引、写入数据的权限。
- 已准备 Python 3.10+ 运行连接检查脚本。
- 如使用 PostgreSQL 连接检查脚本，Python 环境中已安装 `psycopg` 或 `psycopg2`。

本项目当前未安装新依赖。如需要安装 PostgreSQL Python 驱动，应先确认项目依赖管理方式并获得批准。

## 3. 建库步骤

示例命令：

```sql
CREATE DATABASE ai_rag;
CREATE USER ai_rag_user WITH PASSWORD 'change_me';
GRANT ALL PRIVILEGES ON DATABASE ai_rag TO ai_rag_user;
```

说明：

- `change_me` 只是占位值，不应作为真实密码使用。
- 真实账号和密码应通过本地 `.env` 或运维密钥系统管理。
- `.env.example` 只能保留占位配置。

## 4. 配置环境变量

复制 `E:\AI_RAG\.env.example` 为本地 `.env`，并按实际数据库填写。

优先使用：

```env
DATABASE_URL=postgresql://ai_rag_user:change_me@localhost:5432/ai_rag
```

也可以使用拆分配置：

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_rag
DB_USER=ai_rag_user
DB_PASSWORD=change_me
```

安全要求：

- 不提交真实 `.env`。
- 不在日志中打印完整连接串。
- 不把真实账号、密码或密钥写入 Markdown、SQL 或脚本。

## 5. 执行 DDL

进入项目根目录：

```bash
cd /d E:\AI_RAG
```

执行首个迁移脚本：

```bash
psql "%DATABASE_URL%" -f db\migrations\001_create_database_foundation.sql
```

也可以执行结构快照：

```bash
psql "%DATABASE_URL%" -f db\schema.sql
```

预期结果：

- 命令成功结束。
- 创建 11 张基础表。
- 创建主键、外键、唯一约束、检查约束和索引。
- 不创建函数、存储过程、触发器、业务 API 或业务 CRUD。

## 6. 导入示例数据

执行：

```bash
psql "%DATABASE_URL%" -f db\seeds\001_sample_data.sql
```

预期结果：

- 导入 2 个产品型号。
- 导入 2 个产品版本。
- 导入 2 份说明书文档。
- 导入 6 个说明书章节。
- 导入 12 个说明书 Chunk。
- 导入 12 条来源追溯。
- 导入 1 条向量索引版本元数据。
- 导入 12 条切块向量元数据占位。
- 导入 4 条维修联系方式基础数据。
- 导入 10 条黄金问题样例。
- 导入 1 条数据库连接检查记录。

示例数据均为虚构数据，不包含真实客户信息、真实密钥或不可公开资料。

## 7. 运行连接检查

执行：

```bash
python scripts\check_db_connection.py
```

只检查、不写入连接检查记录：

```bash
python scripts\check_db_connection.py --dry-run
```

预期输出：

- 显示脱敏后的数据库连接地址。
- 显示数据库驱动名称。
- 显示数据库版本。
- 显示关键表是否存在。
- 显示示例数据数量是否符合期望。
- 非 dry-run 模式下写入一条 `database_connection_checks` 记录。

退出码：

- `0`：检查通过。
- `1`：连接失败、表缺失或样例数量不符合预期。
- `2`：配置错误，例如缺少连接环境变量或缺少 PostgreSQL Python 驱动。

## 8. 验证命令

检查基础表数量：

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'product_models',
    'product_versions',
    'manual_documents',
    'manual_sections',
    'manual_chunks',
    'chunk_sources',
    'vector_index_manifests',
    'chunk_embedding_metadata',
    'repair_contacts',
    'golden_questions',
    'database_connection_checks'
  )
ORDER BY table_name;
```

预期结果：返回 11 张表。

检查示例数据数量：

```sql
select 'product_models' as table_name, count(*) from product_models
union all select 'product_versions', count(*) from product_versions
union all select 'manual_documents', count(*) from manual_documents
union all select 'manual_sections', count(*) from manual_sections
union all select 'manual_chunks', count(*) from manual_chunks
union all select 'chunk_sources', count(*) from chunk_sources
union all select 'vector_index_manifests', count(*) from vector_index_manifests
union all select 'chunk_embedding_metadata', count(*) from chunk_embedding_metadata
union all select 'repair_contacts', count(*) from repair_contacts
union all select 'golden_questions', count(*) from golden_questions
union all select 'database_connection_checks', count(*) from database_connection_checks;
```

预期结果：

| 表 | 期望行数 |
| --- | ---: |
| product_models | 2 |
| product_versions | 2 |
| manual_documents | 2 |
| manual_sections | 6 |
| manual_chunks | 12 |
| chunk_sources | 12 |
| vector_index_manifests | 1 |
| chunk_embedding_metadata | 12 |
| repair_contacts | 4 |
| golden_questions | 10 |
| database_connection_checks | 至少 1 |

检查追溯链路：

```sql
SELECT
  pm.model_code,
  pv.version_code,
  md.doc_id,
  ms.section_title,
  mc.chunk_id,
  mc.page_no,
  cs.source_file,
  cs.source_page_no
FROM manual_chunks mc
JOIN product_models pm ON pm.id = mc.product_model_id
JOIN product_versions pv ON pv.id = mc.product_version_id
JOIN manual_documents md ON md.id = mc.document_id
JOIN manual_sections ms ON ms.id = mc.section_id
JOIN chunk_sources cs ON cs.chunk_id = mc.id
ORDER BY mc.chunk_id;
```

预期结果：返回 12 条记录，每条 Chunk 都能追溯到产品型号、版本、文档、章节、页码和原始文件。

## 9. 常见失败原因

### 9.1 数据库服务未启动

现象：

- 连接超时。
- 连接被拒绝。
- 无法访问 `localhost:5432`。

处理：

- 启动 PostgreSQL 服务。
- 检查端口是否为 `5432`。
- 检查防火墙或容器端口映射。

### 9.2 连接串错误

现象：

- 数据库名不存在。
- 用户名或密码错误。
- 脚本提示缺少 `DATABASE_URL` 或 `DB_*` 配置。

处理：

- 检查 `.env`。
- 确认 `DATABASE_URL` 使用 `postgresql://`。
- 确认真实密码没有写入 `.env.example`。

### 9.3 用户权限不足

现象：

- 无法建表。
- 无法创建索引。
- 无法写入 seed 数据。
- 无法写入 `database_connection_checks`。

处理：

- 给数据库用户授予目标库和 schema 权限。
- 确认用户有 `CREATE`、`INSERT`、`SELECT` 权限。

### 9.4 表不存在

现象：

- 连接检查提示 missing table。
- 导入 seed 数据时报 relation does not exist。

处理：

- 先执行 `db\migrations\001_create_database_foundation.sql`。
- 确认连接的是同一个数据库。

### 9.5 示例数据未导入

现象：

- 表存在但数量为 0。
- 连接检查提示 count mismatch。

处理：

- 执行 `db\seeds\001_sample_data.sql`。
- 检查 SQL 执行是否中断。
- 确认没有导入到错误数据库。

### 9.6 PostgreSQL Python 驱动缺失

现象：

- 脚本提示未安装 `psycopg` 或 `psycopg2`。

处理：

- 在确认依赖管理方式后安装驱动。
- 或在已有 PostgreSQL 驱动的 Python 环境中运行脚本。

## 10. 后续进入业务开发前需补充

如果下一阶段进入业务开发，需要补充：

- 后端语言和框架选型。
- ORM 或迁移工具选型。
- 数据访问层设计。
- 业务 CRUD 的接口范围和权限边界。
- 前端页面和路由设计。
- RAG 检索、Embedding、向量库和 LLM 调用方案。
- 维修申请与工单流程设计。
- 日志、监控、鉴权、审计和错误处理策略。
- 自动化测试和上线回滚方案。

以上事项不属于当前数据库基础专项交付范围。

## 11. 交付结论

按本文档执行后，新环境应能完成：

- 建库。
- 执行 DDL。
- 导入非敏感示例数据。
- 运行数据库连接检查。
- 验证关键表、约束、示例数据和连接状态。

当前阶段未越界实现业务 CRUD。
