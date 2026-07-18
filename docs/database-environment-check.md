# 数据库环境与技术栈确认

项目名称：电子产品数字说明书与稳定型 RAG 系统  
项目根目录：`E:\AI_RAG`  
文档日期：2026-07-18  
检查范围：数据库类型、ORM、迁移工具、连接配置、环境变量样例、初始化脚本

## 1. 检查摘要

已检查 `E:\AI_RAG` 目录。

检查结果：当前目录为空，未发现可识别的项目代码、数据库配置、ORM 配置、迁移工具、环境变量样例或初始化脚本。

因此，本阶段不对既有技术栈做强行假设，按以下默认建议推进数据库专项：

- 本地开发可使用 SQLite 或 PostgreSQL。
- 生产环境建议 PostgreSQL。
- 向量字段本阶段先以元数据表记录，真实向量库接入留到后续阶段。
- 不安装新依赖，除非后续明确项目技术栈并获得确认。
- 不实现业务 CRUD。

## 2. 检查项目

| 检查项 | 当前结果 | 说明 |
| --- | --- | --- |
| 项目根目录 | 已存在 | `E:\AI_RAG` 已由用户创建 |
| 源码目录 | 未发现 | 未发现 backend、frontend、src、app 等目录 |
| 数据库类型 | 未发现 | 未发现 SQLite、PostgreSQL、MySQL、MongoDB 等配置线索 |
| ORM | 未发现 | 未发现 SQLAlchemy、Prisma、TypeORM、Sequelize、Django ORM 等配置 |
| 迁移工具 | 未发现 | 未发现 Alembic、Prisma migrations、Flyway、Liquibase、Knex 等配置 |
| 连接配置 | 未发现 | 未发现 DATABASE_URL、DB_HOST 等配置文件 |
| 环境变量样例 | 未发现 | 未发现 `.env.example` |
| 初始化脚本 | 未发现 | 未发现 schema.sql、seed.sql、init.sql 或 migrations 目录 |
| Docker 编排 | 未发现 | 未发现 docker-compose.yml 或 compose.yml |
| Python 项目配置 | 未发现 | 未发现 pyproject.toml、requirements.txt、Pipfile |
| Node 项目配置 | 未发现 | 未发现 package.json、pnpm-lock.yaml、yarn.lock |

## 3. 已执行的检查动作

本次检查包括：

- 检查 `E:\AI_RAG` 根目录是否存在。
- 枚举 `E:\AI_RAG` 根目录文件和目录。
- 搜索项目内所有文件。
- 搜索常见数据库、ORM、迁移和环境配置文件。

检查结论显示，当前目录尚未初始化为具体代码项目。

## 4. 默认技术建议

在未发现既有项目技术栈的情况下，建议采用保守默认方案。

| 分类 | 建议 |
| --- | --- |
| 本地数据库 | SQLite 或 PostgreSQL |
| 生产数据库 | PostgreSQL |
| 连接方式 | 通过环境变量配置 |
| 初始交付 | SQL DDL、seed SQL、连接检查脚本、说明文档 |
| 向量数据 | 只记录向量元数据，不保存真实向量 |
| 后续向量库 | Pgvector、Milvus、FAISS 或 Chroma 在后续阶段评估 |
| ORM | 等后端语言和框架确定后再选择 |
| 迁移工具 | 等后端语言和框架确定后再选择 |

## 5. 建议环境变量

后续可创建 `.env.example`，只写占位值，不写真实账号和密码。

建议字段：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ai_rag
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_rag
DB_USER=ai_rag_user
DB_PASSWORD=change_me
DB_SSL_MODE=disable
DB_CONNECT_TIMEOUT_SECONDS=5
```

安全要求：

- `.env.example` 只能包含占位值。
- 真实 `.env` 不应提交到版本库。
- 日志中不得输出完整数据库密码。
- 连接失败信息应脱敏。

## 6. 后续建议目录

建议后续数据库专项目录如下：

```text
E:\AI_RAG
├── db
│   ├── schema.sql
│   ├── migrations
│   │   └── 001_create_database_foundation.sql
│   └── seeds
│       └── 001_sample_data.sql
├── data
│   └── sample
│       └── manual_chunks.sample.jsonl
├── docs
│   ├── database-scope.md
│   ├── database-environment-check.md
│   ├── database-model.md
│   ├── database-er-diagram.mmd
│   └── database-connection-check.md
└── scripts
    └── check_db_connection.py
```

以上目录仅用于数据库建模、示例数据和连接检查，不代表业务 CRUD、业务 API 或前端开发范围。

## 7. 数据库连接检查建议

后续连接检查脚本只做基础检查。

允许检查：

- 数据库连接是否成功。
- 数据库版本或方言信息。
- 关键表是否存在。
- 示例数据数量是否符合预期。
- 写入一条 `database_connection_checks` 检查记录。

禁止扩展为：

- 产品管理 CRUD。
- 说明书管理 CRUD。
- 切块管理 CRUD。
- 维修工单 CRUD。
- 用户反馈 CRUD。
- RAG 检索接口。
- LLM 问答接口。
- 前端调用链路。

## 8. 不安装新依赖声明

本次检查未安装任何新依赖。

由于当前项目为空，暂不建议安装数据库驱动、ORM 或迁移工具。应在后续明确以下信息后再决定是否安装：

- 后端语言。
- 后端框架。
- 目标数据库。
- 是否需要 ORM。
- 是否需要迁移工具。
- 是否需要容器化数据库。

## 9. 后续任务依赖

后续数据库专项任务需要确认：

- 使用 SQLite 还是 PostgreSQL 作为本地开发数据库。
- 是否直接以 PostgreSQL 作为唯一数据库方案。
- 是否需要 Docker Compose 启动本地数据库。
- 是否采用纯 SQL 迁移还是 ORM 迁移。
- 示例数据字段是否需要和真实说明书模板保持一致。
- 向量库是后续接入 Pgvector，还是独立接入 Milvus、FAISS、Chroma。

## 10. 风险与建议

| 风险 | 当前状态 | 建议 |
| --- | --- | --- |
| 项目目录为空 | 已确认 | 先产出数据库文档和基础 SQL，再进入代码实现 |
| 数据库未选型 | 已确认 | 本地 SQLite/PostgreSQL，生产 PostgreSQL |
| ORM 未选型 | 已确认 | 等后端技术栈确定后再选 |
| 迁移工具未选型 | 已确认 | 等数据库和语言确定后再选 |
| 向量库未选型 | 已确认 | 本阶段仅做向量元数据建模 |
| 范围可能扩张 | 需持续控制 | 明确本阶段不实现业务 CRUD |

## 11. 验收结论

本次环境与技术栈确认满足以下验收口径：

- 已检查当前项目目录。
- 已确认当前未发现数据库类型、ORM、迁移工具、连接配置、环境变量样例和初始化脚本。
- 已给出未明确数据库时的保守建议。
- 已明确本阶段只关注数据库建模、示例数据和数据库连接检查。
- 已明确写明不实现业务 CRUD。
- 已明确写明不开发业务 API、不开发前端、不实现 RAG 检索和 LLM 问答。
