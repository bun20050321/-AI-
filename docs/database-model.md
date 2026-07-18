# 数据库概念模型与 ER 设计

项目名称：电子产品数字说明书与稳定型 RAG 系统  
项目根目录：`E:\AI_RAG`  
文档日期：2026-07-18  
阶段定位：数据库建模专项

## 1. 设计目标

本模型用于承载电子产品数字说明书、结构化章节、语义切块、来源追溯、向量索引元数据、维修联系方式基础数据、黄金问题和数据库连接检查记录。

本阶段只做数据库概念模型和 ER 关系设计，不实现业务 CRUD，不开发业务 API，不开发前端页面，不实现 RAG 检索、Embedding 生成、向量重排或 LLM 问答。

重点设计原则：

- 说明书内容必须可追溯到产品型号、版本、章节、页码和原始文件。
- RAG 相关表只记录元数据，不保存真实向量，不实现检索流程。
- 维修联系方式只作为基础数据，不实现维修申请、工单流转或状态变更业务。
- 表结构应兼容后续 PostgreSQL 生产落地，同时便于本地 SQLite 验证。

## 2. 实体总览

| 实体 | 业务含义 | 核心关系 |
| --- | --- | --- |
| `product_models` | 产品型号主数据 | 1 个型号有多个产品版本、维修联系方式和黄金问题 |
| `product_versions` | 产品型号版本 | 归属于产品型号，关联说明书文档、章节、黄金问题 |
| `manual_documents` | 说明书原始文档 | 归属于产品型号和版本，包含多个章节 |
| `manual_sections` | 说明书章节 | 归属于说明书文档，可形成父子章节，包含多个切块 |
| `manual_chunks` | 说明书语义切块 | 归属于章节，关联来源追溯和向量元数据 |
| `chunk_sources` | 切块来源追溯 | 记录 chunk 对原始文件、页码、章节和版本的追溯信息 |
| `vector_index_manifests` | 向量索引版本元数据 | 记录索引版本、模型、维度、构建状态 |
| `chunk_embedding_metadata` | 切块向量元数据 | 记录 chunk 在某个索引中的向量化状态，不保存真实向量 |
| `repair_contacts` | 维修联系方式基础数据 | 归属于产品型号，可按地区和渠道维护基础联系方式 |
| `golden_questions` | 典型问题或黄金问题 | 归属于产品型号/版本，可引用期望 chunk |
| `database_connection_checks` | 数据库连接检查记录 | 记录连接检查结果和错误摘要 |

## 3. 实体设计

### 3.1 product_models

业务含义：产品型号主数据，用于统一标识电子产品型号，是说明书、版本、维修联系方式和黄金问题的上游实体。

关键字段：

| 字段 | 含义 |
| --- | --- |
| `id` | 内部主键 |
| `model_code` | 产品型号编码，例如 `XR-1000` |
| `model_name` | 产品型号名称 |
| `product_line` | 产品线或品类 |
| `description` | 型号说明 |
| `status` | 状态：draft、active、archived |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

主键：`id`

外键：无

唯一约束：

- `uq_product_models_model_code`：`model_code`

索引建议：

- `idx_product_models_status`：`status`
- `idx_product_models_product_line`：`product_line`

### 3.2 product_versions

业务含义：产品型号版本，区分同一型号下不同硬件、固件、说明书或知识库适用版本。

关键字段：

| 字段 | 含义 |
| --- | --- |
| `id` | 内部主键 |
| `product_model_id` | 关联产品型号 |
| `version_code` | 版本编码，例如 `V1.0` |
| `manual_version` | 说明书版本 |
| `release_date` | 发布时间 |
| `effective_from` | 生效开始时间 |
| `effective_to` | 生效结束时间 |
| `status` | 状态：draft、active、archived |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

主键：`id`

外键：

- `product_model_id` -> `product_models.id`

唯一约束：

- `uq_product_versions_model_version`：`product_model_id, version_code`

索引建议：

- `idx_product_versions_model_id`：`product_model_id`
- `idx_product_versions_status`：`status`
- `idx_product_versions_manual_version`：`manual_version`

### 3.3 manual_documents

业务含义：说明书原始文档记录，用于追溯文件名、文件版本、来源、校验值和解析状态。

关键字段：

| 字段 | 含义 |
| --- | --- |
| `id` | 内部主键 |
| `doc_id` | 文档业务标识 |
| `product_model_id` | 关联产品型号 |
| `product_version_id` | 关联产品版本 |
| `title` | 文档标题 |
| `source_file` | 原始文件名或相对路径 |
| `file_type` | 文件类型：pdf、docx、xlsx、md 等 |
| `file_hash` | 文件校验值 |
| `language` | 文档语言 |
| `parse_status` | 解析状态：pending、parsed、failed |
| `published_at` | 文档发布时间 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

主键：`id`

外键：

- `product_model_id` -> `product_models.id`
- `product_version_id` -> `product_versions.id`

唯一约束：

- `uq_manual_documents_doc_id`：`doc_id`
- `uq_manual_documents_file_hash`：`file_hash`

索引建议：

- `idx_manual_documents_model_version`：`product_model_id, product_version_id`
- `idx_manual_documents_parse_status`：`parse_status`
- `idx_manual_documents_source_file`：`source_file`

### 3.4 manual_sections

业务含义：说明书章节结构，保留章节层级、排序、页码范围和来源文档。

关键字段：

| 字段 | 含义 |
| --- | --- |
| `id` | 内部主键 |
| `document_id` | 关联说明书文档 |
| `parent_section_id` | 父章节，可为空 |
| `section_code` | 章节编号，例如 `2.1` |
| `section_title` | 章节标题 |
| `section_level` | 章节层级 |
| `sort_order` | 排序 |
| `page_start` | 起始页码 |
| `page_end` | 结束页码 |
| `review_required` | 是否需要人工复核 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

主键：`id`

外键：

- `document_id` -> `manual_documents.id`
- `parent_section_id` -> `manual_sections.id`

唯一约束：

- `uq_manual_sections_document_code`：`document_id, section_code`

索引建议：

- `idx_manual_sections_document_id`：`document_id`
- `idx_manual_sections_parent_id`：`parent_section_id`
- `idx_manual_sections_title`：`section_title`
- `idx_manual_sections_page_range`：`page_start, page_end`

### 3.5 manual_chunks

业务含义：说明书语义切块，是后续 RAG 检索和回答引用的最小内容单元。本阶段只建模和存储文本及元数据，不实现检索业务。

关键字段：

| 字段 | 含义 |
| --- | --- |
| `id` | 内部主键 |
| `chunk_id` | 切块业务标识 |
| `document_id` | 关联说明书文档 |
| `section_id` | 关联章节 |
| `product_model_id` | 冗余关联型号，便于过滤和追溯 |
| `product_version_id` | 冗余关联版本，便于过滤和追溯 |
| `section_title` | 章节标题快照 |
| `page_no` | 主要页码 |
| `page_start` | 起始页码 |
| `page_end` | 结束页码 |
| `content` | 切块正文 |
| `content_hash` | 内容哈希 |
| `token_count` | 估算 token 数 |
| `char_count` | 字符数 |
| `review_required` | 是否需要人工复核 |
| `status` | 状态：draft、active、archived |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

主键：`id`

外键：

- `document_id` -> `manual_documents.id`
- `section_id` -> `manual_sections.id`
- `product_model_id` -> `product_models.id`
- `product_version_id` -> `product_versions.id`

唯一约束：

- `uq_manual_chunks_chunk_id`：`chunk_id`
- `uq_manual_chunks_content_scope`：`document_id, content_hash`

索引建议：

- `idx_manual_chunks_model_version`：`product_model_id, product_version_id`
- `idx_manual_chunks_section_id`：`section_id`
- `idx_manual_chunks_page_no`：`page_no`
- `idx_manual_chunks_content_hash`：`content_hash`
- `idx_manual_chunks_status`：`status`

### 3.6 chunk_sources

业务含义：切块来源追溯表，记录每个 chunk 对原始文档、章节、页码、文件和文本范围的引用关系。

关键字段：

| 字段 | 含义 |
| --- | --- |
| `id` | 内部主键 |
| `chunk_id` | 关联切块 |
| `document_id` | 关联说明书文档 |
| `section_id` | 关联章节 |
| `source_file` | 原始文件名或路径 |
| `source_page_no` | 原始页码 |
| `source_section_title` | 原始章节标题 |
| `source_anchor` | 段落锚点或文本范围 |
| `source_text_hash` | 来源文本哈希 |
| `created_at` | 创建时间 |

主键：`id`

外键：

- `chunk_id` -> `manual_chunks.id`
- `document_id` -> `manual_documents.id`
- `section_id` -> `manual_sections.id`

唯一约束：

- `uq_chunk_sources_chunk_source`：`chunk_id, document_id, source_page_no, source_anchor`

索引建议：

- `idx_chunk_sources_chunk_id`：`chunk_id`
- `idx_chunk_sources_document_page`：`document_id, source_page_no`
- `idx_chunk_sources_source_file`：`source_file`

### 3.7 vector_index_manifests

业务含义：向量索引版本元数据，记录某次索引构建使用的模型、维度、chunk 数量、状态和构建时间。本阶段不实现向量检索。

关键字段：

| 字段 | 含义 |
| --- | --- |
| `id` | 内部主键 |
| `index_name` | 索引名称 |
| `index_version` | 索引版本 |
| `embedding_model` | Embedding 模型名称 |
| `embedding_model_version` | Embedding 模型版本 |
| `embedding_dimension` | 向量维度 |
| `vector_store_type` | 向量库类型占位，例如 pgvector、milvus、faiss、chroma |
| `chunk_count` | 索引覆盖 chunk 数量 |
| `build_status` | 构建状态：planned、building、ready、failed、archived |
| `built_at` | 构建完成时间 |
| `metadata_json` | 扩展元数据 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

主键：`id`

外键：无

唯一约束：

- `uq_vector_index_name_version`：`index_name, index_version`

索引建议：

- `idx_vector_index_status`：`build_status`
- `idx_vector_index_model`：`embedding_model, embedding_model_version`

### 3.8 chunk_embedding_metadata

业务含义：切块向量元数据，记录 chunk 在某个索引版本中的向量化状态、维度和外部向量引用。本阶段不保存真实向量。

关键字段：

| 字段 | 含义 |
| --- | --- |
| `id` | 内部主键 |
| `chunk_id` | 关联切块 |
| `vector_index_manifest_id` | 关联向量索引版本 |
| `embedding_status` | 向量化状态：pending、embedded、failed、skipped |
| `embedding_model` | Embedding 模型名称快照 |
| `embedding_dimension` | 向量维度 |
| `external_vector_id` | 外部向量库 ID，占位 |
| `content_hash` | 向量化时的内容哈希 |
| `error_message` | 失败摘要 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

主键：`id`

外键：

- `chunk_id` -> `manual_chunks.id`
- `vector_index_manifest_id` -> `vector_index_manifests.id`

唯一约束：

- `uq_chunk_embedding_index_chunk`：`vector_index_manifest_id, chunk_id`

索引建议：

- `idx_chunk_embedding_chunk_id`：`chunk_id`
- `idx_chunk_embedding_status`：`embedding_status`
- `idx_chunk_embedding_external_vector_id`：`external_vector_id`

### 3.9 repair_contacts

业务含义：维修联系方式基础数据，用于记录某产品型号适用的售后电话、服务区域、服务时间和展示状态。本阶段不实现维修申请或工单业务。

关键字段：

| 字段 | 含义 |
| --- | --- |
| `id` | 内部主键 |
| `product_model_id` | 关联产品型号，可为空表示通用联系方式 |
| `region_code` | 服务区域编码 |
| `region_name` | 服务区域名称 |
| `contact_type` | 联系类型：phone、email、url、address |
| `contact_value` | 联系方式内容 |
| `service_hours` | 服务时间 |
| `priority` | 展示优先级 |
| `status` | 状态：active、inactive、archived |
| `effective_from` | 生效开始时间 |
| `effective_to` | 生效结束时间 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

主键：`id`

外键：

- `product_model_id` -> `product_models.id`

唯一约束：

- `uq_repair_contacts_scope_value`：`product_model_id, region_code, contact_type, contact_value`

索引建议：

- `idx_repair_contacts_model_id`：`product_model_id`
- `idx_repair_contacts_region`：`region_code`
- `idx_repair_contacts_status_priority`：`status, priority`

### 3.10 golden_questions

业务含义：典型问题或黄金问题，用于后续评测数据准备。本阶段只保存问题和期望引用元数据，不执行评测业务。

关键字段：

| 字段 | 含义 |
| --- | --- |
| `id` | 内部主键 |
| `question_id` | 问题业务标识 |
| `product_model_id` | 关联产品型号 |
| `product_version_id` | 关联产品版本，可为空 |
| `scenario` | 场景：install、operation、parameter、safety、troubleshooting、repair |
| `question` | 问题文本 |
| `expected_answer_summary` | 期望答案摘要 |
| `expected_chunk_id` | 期望引用 chunk |
| `should_refuse` | 是否应拒答 |
| `should_refer_repair` | 是否应建议联系维修 |
| `status` | 状态：draft、active、archived |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

主键：`id`

外键：

- `product_model_id` -> `product_models.id`
- `product_version_id` -> `product_versions.id`
- `expected_chunk_id` -> `manual_chunks.id`

唯一约束：

- `uq_golden_questions_question_id`：`question_id`

索引建议：

- `idx_golden_questions_model_version`：`product_model_id, product_version_id`
- `idx_golden_questions_scenario`：`scenario`
- `idx_golden_questions_status`：`status`

### 3.11 database_connection_checks

业务含义：数据库连接检查记录，用于记录连接检查脚本的执行结果，帮助确认数据库是否可访问、关键表是否存在、示例数据是否满足预期。

关键字段：

| 字段 | 含义 |
| --- | --- |
| `id` | 内部主键 |
| `check_id` | 检查业务标识 |
| `database_type` | 数据库类型 |
| `database_version` | 数据库版本 |
| `check_status` | 检查状态：success、failed |
| `checked_tables` | 已检查表列表 |
| `sample_data_summary` | 示例数据数量摘要 |
| `error_message` | 脱敏后的错误摘要 |
| `checked_at` | 检查时间 |
| `created_at` | 创建时间 |

主键：`id`

外键：无

唯一约束：

- `uq_database_connection_checks_check_id`：`check_id`

索引建议：

- `idx_database_connection_checks_status`：`check_status`
- `idx_database_connection_checks_checked_at`：`checked_at`

## 4. 追溯链路

说明书内容追溯链路如下：

```text
product_models
  -> product_versions
  -> manual_documents
  -> manual_sections
  -> manual_chunks
  -> chunk_sources
```

每个 `manual_chunks` 记录应至少保留：

- `product_model_id`
- `product_version_id`
- `document_id`
- `section_id`
- `section_title`
- `page_no`
- `content_hash`

每个 `chunk_sources` 记录应至少保留：

- `chunk_id`
- `document_id`
- `section_id`
- `source_file`
- `source_page_no`
- `source_section_title`
- `source_anchor`
- `source_text_hash`

这样后续即使进入 RAG 检索或回答阶段，也可以从回答引用追溯回型号、版本、章节、页码和原始文件。

## 5. RAG 元数据边界

本阶段只建模以下 RAG 相关元数据：

- chunk 文本和来源追溯。
- 向量索引版本元数据。
- chunk 向量化状态。
- 外部向量库 ID 占位。
- Embedding 模型名称、版本和维度。

本阶段不实现：

- Embedding 生成。
- 向量写入。
- 向量检索。
- Top-K 检索。
- 混合检索。
- 重排。
- Prompt 拼装。
- LLM 调用。
- 问答接口。

## 6. 维修联系方式边界

`repair_contacts` 只保存基础联系方式。

允许建模：

- 产品型号适用范围。
- 区域。
- 联系类型。
- 联系方式。
- 服务时间。
- 生效状态。

不实现：

- 维修申请提交。
- 维修工单创建。
- 工单查询。
- 工单状态变更。
- 客服分配。
- 通知或回访流程。

## 7. 约束汇总

| 表 | 主键 | 主要唯一约束 | 主要外键 |
| --- | --- | --- | --- |
| `product_models` | `id` | `model_code` | 无 |
| `product_versions` | `id` | `product_model_id, version_code` | `product_model_id` |
| `manual_documents` | `id` | `doc_id`, `file_hash` | `product_model_id`, `product_version_id` |
| `manual_sections` | `id` | `document_id, section_code` | `document_id`, `parent_section_id` |
| `manual_chunks` | `id` | `chunk_id`, `document_id, content_hash` | `document_id`, `section_id`, `product_model_id`, `product_version_id` |
| `chunk_sources` | `id` | `chunk_id, document_id, source_page_no, source_anchor` | `chunk_id`, `document_id`, `section_id` |
| `vector_index_manifests` | `id` | `index_name, index_version` | 无 |
| `chunk_embedding_metadata` | `id` | `vector_index_manifest_id, chunk_id` | `chunk_id`, `vector_index_manifest_id` |
| `repair_contacts` | `id` | `product_model_id, region_code, contact_type, contact_value` | `product_model_id` |
| `golden_questions` | `id` | `question_id` | `product_model_id`, `product_version_id`, `expected_chunk_id` |
| `database_connection_checks` | `id` | `check_id` | 无 |

## 8. 索引汇总

建议优先创建以下索引：

- `product_models(status)`
- `product_versions(product_model_id)`
- `product_versions(status)`
- `manual_documents(product_model_id, product_version_id)`
- `manual_documents(parse_status)`
- `manual_sections(document_id)`
- `manual_sections(parent_section_id)`
- `manual_chunks(product_model_id, product_version_id)`
- `manual_chunks(section_id)`
- `manual_chunks(page_no)`
- `manual_chunks(content_hash)`
- `chunk_sources(chunk_id)`
- `chunk_sources(document_id, source_page_no)`
- `vector_index_manifests(build_status)`
- `chunk_embedding_metadata(chunk_id)`
- `chunk_embedding_metadata(embedding_status)`
- `repair_contacts(product_model_id)`
- `repair_contacts(region_code)`
- `golden_questions(product_model_id, product_version_id)`
- `golden_questions(scenario)`
- `database_connection_checks(check_status)`
- `database_connection_checks(checked_at)`

## 9. 验收结论

本模型满足以下验收标准：

- ER 关系覆盖产品型号、版本、说明书、章节、切块、来源追溯、向量索引元数据、维修联系方式、黄金问题和数据库连接检查。
- 主键、外键、唯一约束和索引建议已明确。
- 说明书内容可追溯到产品型号、版本、章节、页码和原始文件。
- RAG 相关数据只做元数据建模，未引入检索、问答或业务 CRUD 实现要求。
- 维修联系方式只做基础数据建模，未引入维修申请、工单流转或状态变更业务。
