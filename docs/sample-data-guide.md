# 非敏感示例数据与初始化说明

项目名称：电子产品数字说明书与稳定型 RAG 系统  
项目根目录：`E:\AI_RAG`  
文档日期：2026-07-18  
范围：示例数据、初始化顺序和校验说明

## 1. 目标

本文件提供一套可公开、非敏感、可重复导入的示例数据，用于初始化数据库、验证表关系和检查连接状态。

本阶段不实现业务 CRUD，不开发业务 API，不开发前端，不实现 RAG 检索或 LLM 问答。

## 2. 示例数据内容

本次示例覆盖：

- 2 个产品型号。
- 每个型号 1 个版本。
- 2 份说明书文档。
- 每份说明书 3 个章节。
- 每个章节 2 个 Chunk。
- 12 条切块来源追溯。
- 1 条向量索引版本元数据。
- 12 条切块向量元数据占位。
- 4 条维修联系方式基础数据。
- 10 条黄金问题样例。
- 1 条数据库连接检查记录。

所有数据均为虚构示例，不包含真实客户信息、真实密钥或不可公开资料。

## 3. 文件说明

- `E:\AI_RAG\db\seeds\001_sample_data.sql`
- `E:\AI_RAG\data\sample\manual_chunks.sample.jsonl`

`manual_chunks.sample.jsonl` 只用于文本样例、导入校验和后续数据接口对齐，不包含真实向量。

## 4. 导入顺序

建议按以下顺序执行：

1. 执行 `db/schema.sql` 或 `db/migrations/001_create_database_foundation.sql`。
2. 执行 `db/seeds/001_sample_data.sql`。
3. 检查表行数和外键关系。
4. 检查 `manual_chunks.sample.jsonl` 的字段是否与表结构一致。

## 5. 运行示例

如果使用 PostgreSQL，可以按如下方式导入：

```bash
psql "$DATABASE_URL" -f db/migrations/001_create_database_foundation.sql
psql "$DATABASE_URL" -f db/seeds/001_sample_data.sql
```

如果只想检查结构快照，也可以：

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

## 6. 数据结构对齐

### 6.1 manual_chunks 对齐字段

`manual_chunks.sample.jsonl` 每条记录包含：

- `chunk_id`
- `doc_id`
- `product_model`
- `version`
- `section_title`
- `page_no`
- `source_file`
- `content_hash`
- `content`

### 6.2 向量元数据

本阶段不生成真实 Embedding 向量，只保留以下元数据字段：

- `embedding_status`
- `embedding_model`
- `embedding_dimension`
- `external_vector_id`

## 7. 校验建议

导入完成后，建议检查：

- `product_models` 行数是否为 2。
- `product_versions` 行数是否为 2。
- `manual_documents` 行数是否为 2。
- `manual_sections` 行数是否为 6。
- `manual_chunks` 行数是否为 12。
- `chunk_sources` 行数是否为 12。
- `vector_index_manifests` 行数是否为 1。
- `chunk_embedding_metadata` 行数是否为 12。
- `repair_contacts` 行数是否为 4。
- `golden_questions` 行数是否为 10。
- `database_connection_checks` 行数是否为 1。

示例检查 SQL：

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

## 8. 连接检查说明

数据库连接检查只做基础验证：

- 能连接数据库。
- 能读取数据库版本信息。
- 能检查关键表是否存在。
- 能验证示例数据数量。
- 能写入一条连接检查记录。

不做以下内容：

- 不做业务 CRUD。
- 不做说明书业务接口。
- 不做维修工单接口。
- 不做 RAG 检索。
- 不做 LLM 问答。

## 9. 说明

本套示例数据适合：

- 初始化测试库。
- 验证表结构和外键。
- 验证样例 JSONL 与表字段对齐。
- 验证后续导入脚本的基础数据依赖。

不适合：

- 真实业务上线。
- 真实客户数据存储。
- 真实模型向量生产入库。
