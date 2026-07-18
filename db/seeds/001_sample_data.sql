-- sample seed data for E:\AI_RAG
-- non-sensitive, fictional data only
-- apply after db/schema.sql or migration 001

BEGIN;

INSERT INTO product_models (
    id, model_code, model_name, product_line, description, status, created_at, updated_at
) VALUES
    (101, 'EP-100', 'EP-100 智能环境控制器', 'Smart Control', '虚构示例型号，用于数据库专项测试。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (102, 'SP-200', 'SP-200 智能投影设备', 'Smart Display', '虚构示例型号，用于数据库专项测试。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (model_code) DO NOTHING;

INSERT INTO product_versions (
    id, product_model_id, version_code, manual_version, release_date, effective_from, effective_to, status, created_at, updated_at
) VALUES
    (201, 101, 'V1.0', 'M1.0', DATE '2026-01-15', TIMESTAMPTZ '2026-01-15 00:00:00+08', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (202, 102, 'V1.0', 'M1.0', DATE '2026-02-20', TIMESTAMPTZ '2026-02-20 00:00:00+08', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (product_model_id, version_code) DO NOTHING;

INSERT INTO manual_documents (
    id, doc_id, product_model_id, product_version_id, title, source_file, file_type, file_hash, language, parse_status, published_at, created_at, updated_at
) VALUES
    (301, 'DOC-EP100-001', 101, 201, 'EP-100 智能环境控制器使用说明书', 'manuals/EP-100_user_manual_v1.pdf', 'pdf', 'sha256-ep100-manual-v1', 'zh-CN', 'parsed', TIMESTAMPTZ '2026-01-15 08:00:00+08', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (302, 'DOC-SP200-001', 102, 202, 'SP-200 智能投影设备使用说明书', 'manuals/SP-200_user_manual_v1.pdf', 'pdf', 'sha256-sp200-manual-v1', 'zh-CN', 'parsed', TIMESTAMPTZ '2026-02-20 08:00:00+08', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (doc_id) DO NOTHING;

INSERT INTO manual_sections (
    id, document_id, parent_section_id, section_code, section_title, section_level, sort_order, page_start, page_end, review_required, created_at, updated_at
) VALUES
    (401, 301, NULL, '1', '产品概述', 1, 1, 1, 2, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (402, 301, NULL, '2', '安装与连接', 1, 2, 3, 6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (403, 301, NULL, '3', '日常操作', 1, 3, 7, 10, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (404, 302, NULL, '1', '产品概述', 1, 1, 1, 2, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (405, 302, NULL, '2', '安装与连接', 1, 2, 3, 6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (406, 302, NULL, '3', '播放与维护', 1, 3, 7, 10, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (document_id, section_code) DO NOTHING;

INSERT INTO manual_chunks (
    id, chunk_id, document_id, section_id, product_model_id, product_version_id, section_title, page_no, page_start, page_end, content, content_hash, token_count, char_count, review_required, status, created_at, updated_at
) VALUES
    (501, 'CH-EP100-001', 301, 401, 101, 201, '产品概述', 1, 1, 1, 'EP-100 用于示例演示，支持温度与空气质量的基础监测。', 'sha256-ch-ep100-001', 28, 52, FALSE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (502, 'CH-EP100-002', 301, 401, 101, 201, '产品概述', 2, 2, 2, '面板状态指示灯用于显示运行、待机和告警三种状态。', 'sha256-ch-ep100-002', 31, 49, FALSE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (503, 'CH-EP100-003', 301, 402, 101, 201, '安装与连接', 3, 3, 3, '安装前请确认电源规格与安装环境符合说明书建议。', 'sha256-ch-ep100-003', 34, 48, TRUE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (504, 'CH-EP100-004', 301, 402, 101, 201, '安装与连接', 4, 4, 4, '首次连接后建议执行自检，以确认传感器工作正常。', 'sha256-ch-ep100-004', 32, 47, TRUE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (505, 'CH-EP100-005', 301, 403, 101, 201, '日常操作', 7, 7, 7, '可通过面板按键切换自动模式和手动模式。', 'sha256-ch-ep100-005', 27, 40, FALSE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (506, 'CH-EP100-006', 301, 403, 101, 201, '日常操作', 8, 8, 8, '若设备提示告警，请先检查供电和环境状态。', 'sha256-ch-ep100-006', 29, 41, FALSE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (507, 'CH-SP200-001', 302, 404, 102, 202, '产品概述', 1, 1, 1, 'SP-200 为虚构投影设备示例，支持基础投影和输入切换。', 'sha256-ch-sp200-001', 30, 52, FALSE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (508, 'CH-SP200-002', 302, 404, 102, 202, '产品概述', 2, 2, 2, '设备支持遥控器和面板双重控制方式。', 'sha256-ch-sp200-002', 24, 37, FALSE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (509, 'CH-SP200-003', 302, 405, 102, 202, '安装与连接', 3, 3, 3, '安装时应保持通风空间，并确保投射距离符合建议范围。', 'sha256-ch-sp200-003', 35, 52, TRUE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (510, 'CH-SP200-004', 302, 405, 102, 202, '安装与连接', 4, 4, 4, '首次开机后建议校正画面并检查信号源输入。', 'sha256-ch-sp200-004', 31, 47, TRUE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (511, 'CH-SP200-005', 302, 406, 102, 202, '播放与维护', 7, 7, 7, '播放过程中可调整亮度、音量和信号源。', 'sha256-ch-sp200-005', 26, 39, FALSE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (512, 'CH-SP200-006', 302, 406, 102, 202, '播放与维护', 8, 8, 8, '如出现异常噪声，请先关闭设备并检查散热通道。', 'sha256-ch-sp200-006', 30, 47, FALSE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (chunk_id) DO NOTHING;

INSERT INTO chunk_sources (
    id, chunk_id, document_id, section_id, source_file, source_page_no, source_section_title, source_anchor, source_text_hash, created_at
) VALUES
    (601, 501, 301, 401, 'manuals/EP-100_user_manual_v1.pdf', 1, '产品概述', 'p1#para1', 'sha256-src-ep100-001', CURRENT_TIMESTAMP),
    (602, 502, 301, 401, 'manuals/EP-100_user_manual_v1.pdf', 2, '产品概述', 'p2#para1', 'sha256-src-ep100-002', CURRENT_TIMESTAMP),
    (603, 503, 301, 402, 'manuals/EP-100_user_manual_v1.pdf', 3, '安装与连接', 'p3#para1', 'sha256-src-ep100-003', CURRENT_TIMESTAMP),
    (604, 504, 301, 402, 'manuals/EP-100_user_manual_v1.pdf', 4, '安装与连接', 'p4#para1', 'sha256-src-ep100-004', CURRENT_TIMESTAMP),
    (605, 505, 301, 403, 'manuals/EP-100_user_manual_v1.pdf', 7, '日常操作', 'p7#para1', 'sha256-src-ep100-005', CURRENT_TIMESTAMP),
    (606, 506, 301, 403, 'manuals/EP-100_user_manual_v1.pdf', 8, '日常操作', 'p8#para1', 'sha256-src-ep100-006', CURRENT_TIMESTAMP),
    (607, 507, 302, 404, 'manuals/SP-200_user_manual_v1.pdf', 1, '产品概述', 'p1#para1', 'sha256-src-sp200-001', CURRENT_TIMESTAMP),
    (608, 508, 302, 404, 'manuals/SP-200_user_manual_v1.pdf', 2, '产品概述', 'p2#para1', 'sha256-src-sp200-002', CURRENT_TIMESTAMP),
    (609, 509, 302, 405, 'manuals/SP-200_user_manual_v1.pdf', 3, '安装与连接', 'p3#para1', 'sha256-src-sp200-003', CURRENT_TIMESTAMP),
    (610, 510, 302, 405, 'manuals/SP-200_user_manual_v1.pdf', 4, '安装与连接', 'p4#para1', 'sha256-src-sp200-004', CURRENT_TIMESTAMP),
    (611, 511, 302, 406, 'manuals/SP-200_user_manual_v1.pdf', 7, '播放与维护', 'p7#para1', 'sha256-src-sp200-005', CURRENT_TIMESTAMP),
    (612, 512, 302, 406, 'manuals/SP-200_user_manual_v1.pdf', 8, '播放与维护', 'p8#para1', 'sha256-src-sp200-006', CURRENT_TIMESTAMP)
ON CONFLICT (chunk_id, document_id, source_page_no, source_anchor) DO NOTHING;

INSERT INTO vector_index_manifests (
    id, index_name, index_version, embedding_model, embedding_model_version, embedding_dimension, vector_store_type, chunk_count, build_status, built_at, metadata_json, created_at, updated_at
) VALUES
    (701, 'manual-index', 'v1', 'all-MiniLM-L6-v2', '1.0.0', 384, 'pgvector', 12, 'ready', CURRENT_TIMESTAMP, '{"source":"sample-seed","note":"no real vectors stored"}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (index_name, index_version) DO NOTHING;

INSERT INTO chunk_embedding_metadata (
    id, chunk_id, vector_index_manifest_id, embedding_status, embedding_model, embedding_dimension, external_vector_id, content_hash, error_message, created_at, updated_at
) VALUES
    (801, 501, 701, 'pending', 'all-MiniLM-L6-v2', 384, NULL, 'sha256-ch-ep100-001', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (802, 502, 701, 'pending', 'all-MiniLM-L6-v2', 384, NULL, 'sha256-ch-ep100-002', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (803, 503, 701, 'pending', 'all-MiniLM-L6-v2', 384, NULL, 'sha256-ch-ep100-003', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (804, 504, 701, 'pending', 'all-MiniLM-L6-v2', 384, NULL, 'sha256-ch-ep100-004', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (805, 505, 701, 'pending', 'all-MiniLM-L6-v2', 384, NULL, 'sha256-ch-ep100-005', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (806, 506, 701, 'pending', 'all-MiniLM-L6-v2', 384, NULL, 'sha256-ch-ep100-006', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (807, 507, 701, 'pending', 'all-MiniLM-L6-v2', 384, NULL, 'sha256-ch-sp200-001', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (808, 508, 701, 'pending', 'all-MiniLM-L6-v2', 384, NULL, 'sha256-ch-sp200-002', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (809, 509, 701, 'pending', 'all-MiniLM-L6-v2', 384, NULL, 'sha256-ch-sp200-003', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (810, 510, 701, 'pending', 'all-MiniLM-L6-v2', 384, NULL, 'sha256-ch-sp200-004', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (811, 511, 701, 'pending', 'all-MiniLM-L6-v2', 384, NULL, 'sha256-ch-sp200-005', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (812, 512, 701, 'pending', 'all-MiniLM-L6-v2', 384, NULL, 'sha256-ch-sp200-006', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (vector_index_manifest_id, chunk_id) DO NOTHING;

INSERT INTO repair_contacts (
    id, product_model_id, region_code, region_name, contact_type, contact_value, service_hours, priority, status, effective_from, effective_to, created_at, updated_at
) VALUES
    (901, 101, 'CN-NA', '全国通用', 'phone', '400-800-1000', '09:00-18:00', 1, 'active', TIMESTAMPTZ '2026-01-01 00:00:00+08', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (902, 101, 'CN-NA', '全国通用', 'url', 'https://support.example.com/ep100', '09:00-18:00', 2, 'active', TIMESTAMPTZ '2026-01-01 00:00:00+08', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (903, 102, 'CN-NA', '全国通用', 'phone', '400-800-2000', '09:00-18:00', 1, 'active', TIMESTAMPTZ '2026-02-01 00:00:00+08', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (904, 102, 'CN-NA', '全国通用', 'email', 'support@example.com', '09:00-18:00', 2, 'active', TIMESTAMPTZ '2026-02-01 00:00:00+08', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (product_model_id, region_code, contact_type, contact_value) DO NOTHING;

INSERT INTO golden_questions (
    id, question_id, product_model_id, product_version_id, scenario, question, expected_answer_summary, expected_chunk_id, should_refuse, should_refer_repair, status, created_at, updated_at
) VALUES
    (1001, 'GQ-EP100-001', 101, 201, 'install', 'EP-100 如何完成首次安装？', '安装前确认供电和环境，再按照说明书安装与连接。', 503, FALSE, FALSE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1002, 'GQ-EP100-002', 101, 201, 'operation', 'EP-100 如何切换自动和手动模式？', '通过面板按键切换自动模式和手动模式。', 505, FALSE, FALSE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1003, 'GQ-EP100-003', 101, 201, 'safety', 'EP-100 出现告警时应该怎么做？', '先检查供电和环境状态，再继续处理。', 506, FALSE, TRUE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1004, 'GQ-EP100-004', 101, 201, 'parameter', 'EP-100 支持哪些基础状态显示？', '状态灯用于显示运行、待机和告警。', 502, FALSE, FALSE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1005, 'GQ-SP200-001', 102, 202, 'install', 'SP-200 安装时要注意什么？', '保持通风空间并确保投射距离符合建议。', 509, FALSE, FALSE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1006, 'GQ-SP200-002', 102, 202, 'operation', 'SP-200 如何选择信号源？', '首次开机后校正画面并检查输入信号源。', 510, FALSE, FALSE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1007, 'GQ-SP200-003', 102, 202, 'parameter', 'SP-200 支持哪些控制方式？', '支持遥控器和面板双重控制方式。', 508, FALSE, FALSE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1008, 'GQ-SP200-004', 102, 202, 'safety', 'SP-200 出现异常噪声怎么办？', '先关闭设备并检查散热通道。', 512, FALSE, TRUE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1009, 'GQ-SP200-005', 102, 202, 'troubleshooting', 'SP-200 亮度异常如何处理？', '先检查播放设置和信号源。', 511, FALSE, FALSE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1010, 'GQ-GENERAL-001', 101, 201, 'repair', '如果设备持续无法启动怎么办？', '建议联系维修并提供型号和现象摘要。', 503, TRUE, TRUE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (question_id) DO NOTHING;

INSERT INTO database_connection_checks (
    id, check_id, database_type, database_version, check_status, checked_tables, sample_data_summary, error_message, checked_at, created_at
) VALUES
    (1101, 'DB-CHECK-001', 'postgresql', '13+', 'success',
     '["product_models","product_versions","manual_documents","manual_sections","manual_chunks","chunk_sources","vector_index_manifests","chunk_embedding_metadata","repair_contacts","golden_questions"]'::jsonb,
     '{"product_models":2,"product_versions":2,"manual_documents":2,"manual_sections":6,"manual_chunks":12,"chunk_sources":12,"vector_index_manifests":1,"chunk_embedding_metadata":12,"repair_contacts":4,"golden_questions":10}'::jsonb,
     NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (check_id) DO NOTHING;

COMMIT;
