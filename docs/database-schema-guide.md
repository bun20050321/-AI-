# 数据库物理结构与初始化指南

项目名称：电子产品数字说明书与稳定型 RAG 系统  
项目根目录：`E:\AI_RAG`  
文档日期：2026-07-18  
范围：数据库表结构、DDL、迁移脚本和初始化说明

## 1. 目标

本指南用于说明数据库物理表结构如何初始化、如何命名迁移文件、如何执行 DDL，以及如何验证表、约束和索引是否可用。

本阶段只覆盖：

- 数据库表。
- 主键、外键、唯一约束。
- 检查约束。
- 索引。
- 初始化顺序。
- 环境变量说明。

本阶段不包括：

- 业务 CRUD。
- API、Service、Controller。
- RAG 检索。
- Embedding 生成。
- LLM 问答。
- 维修工单流程。

## 2. 适用数据库

当前 DDL 以 PostgreSQL 13+ 为目标。

原因：

- 支持身份列、JSONB、检查约束和完备外键。
- 适合说明书、元数据、审计字段和后续生产扩展。

当前项目目录未发现既有数据库技术栈，因此不绑定 ORM，也不绑定迁移框架。

## 3. 文件说明

建议使用以下文件：

- `E:\AI_RAG\db\schema.sql`：数据库结构快照。
- `E:\AI_RAG\db\migrations\001_create_database_foundation.sql`：首个迁移文件。

迁移命名约定：

- 采用三位序号前缀。
- 格式：`NNN_description.sql`
- 例如：`001_create_database_foundation.sql`
- 后续可按 `002_...`、`003_...` 继续递增。

## 4. 建表顺序

建议按以下顺序执行：

1. `product_models`
2. `product_versions`
3. `manual_documents`
4. `manual_sections`
5. `manual_chunks`
6. `chunk_sources`
7. `vector_index_manifests`
8. `chunk_embedding_metadata`
9. `repair_contacts`
10. `golden_questions`
11. `database_connection_checks`

该顺序保证所有外键引用都能在目标表存在后再创建。

## 5. 关键设计说明

### 5.1 审计字段

所有核心业务表都包含：

- `created_at`
- `updated_at`
- `status` 或等价状态字段

说明：

- `created_at` 和 `updated_at` 使用默认当前时间。
- 由于本阶段不实现触发器或函数，`updated_at` 的自动刷新应由后续应用层或后续迁移方案处理。

### 5.2 追溯字段

说明书链路中的关键追溯字段包括：

- `product_model_id`
- `product_version_id`
- `document_id`
- `section_id`
- `section_title`
- `page_no`
- `page_start`
- `page_end`
- `source_file`
- `content_hash`

这些字段保证后续可以从切块追溯回原始文件和页码。

### 5.3 RAG 元数据

RAG 相关只保留元数据，不保存真实向量：

- `vector_index_manifests.metadata_json`
- `chunk_embedding_metadata.embedding_status`
- `chunk_embedding_metadata.embedding_model`
- `chunk_embedding_metadata.embedding_dimension`
- `chunk_embedding_metadata.external_vector_id`

本阶段不做向量检索、不做重排、不做问答。

### 5.4 维修联系方式

`repair_contacts` 只存基础联系方式：

- 型号
- 区域
- 联系类型
- 联系内容
- 服务时间

不存工单，不做状态流转。

## 6. 环境变量建议

后续数据库连接建议通过环境变量配置：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ai_rag
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_rag
DB_USER=ai_rag_user
DB_PASSWORD=change_me
```

要求：

- 只写占位值。
- 不提交真实密码。
- 不在日志中打印完整连接串。

## 7. 执行方式

如果使用 `psql`，可按如下方式执行：

```bash
psql "$DATABASE_URL" -f db/migrations/001_create_database_foundation.sql
```

或直接执行快照文件：

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

建议：

- 新库初始化优先执行迁移文件。
- `schema.sql` 作为结构快照和校验参考。

## 8. 约束与索引覆盖

本结构已经覆盖以下关键约束和索引需求：

- 型号编码、版本编码、文档编号、文件哈希、切块编号、问题编号、连接检查编号均有唯一约束。
- 章节和切块均保留页码范围。
- `product_model`、`version`、`section_title`、`content_hash`、`chunk_id` 均有索引支持。
- RAG 元数据与维修联系方式均有基础索引。

## 9. 初始化后检查

初始化完成后，建议检查：

- 11 张基础表是否存在。
- 每张表的主键和唯一约束是否存在。
- 外键是否正确建立。
- 索引是否按命名创建。
- `manual_documents`、`manual_sections`、`manual_chunks` 的追溯链路是否完整。
- `database_connection_checks` 是否可记录检查结果。

## 10. 后续依赖

后续如果进入应用开发，还需要补充确认：

- 后端语言和框架。
- ORM 和迁移工具。
- 连接池和事务策略。
- `updated_at` 的刷新方式。
- 是否增加视图、查询封装或只读报表。

## 11. 验收结论

本结构满足当前验收要求：

- DDL 仅包含表、约束、索引和检查约束。
- 覆盖产品型号、版本、说明书文档、章节、切块、来源追溯、向量索引元数据、切块向量元数据、维修联系方式、黄金问题和连接检查记录。
- 关键查询路径已加索引。
- 未实现业务 CRUD、存储过程、API、Service 或 Controller。
