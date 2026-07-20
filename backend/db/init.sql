-- MySQL database initialization script for AI_RAG.
-- Scope: schema only. No business CRUD, no real accounts, no real passwords,
-- no real customer data, no RAG retrieval, no embedding generation, no LLM calls.
-- Target: MySQL 8.0+

SET NAMES utf8mb4;
SET time_zone = '+08:00';

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS repairer_logs;
DROP TABLE IF EXISTS chat_history;
DROP TABLE IF EXISTS knowledge_chunks;
DROP TABLE IF EXISTS repair_orders;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    user_id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key for system users',
    username VARCHAR(50) NOT NULL COMMENT 'Unique login username',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Password hash only; never store plaintext passwords',
    role ENUM('USER', 'REPAIRER', 'ADMIN') NOT NULL DEFAULT 'USER' COMMENT 'User role',
    real_name VARCHAR(50) NOT NULL COMMENT 'Display name; sample data must be fictional',
    phone VARCHAR(20) NOT NULL COMMENT 'Contact phone; sample data must be fictional',
    email VARCHAR(100) NULL COMMENT 'Contact email',
    status ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE' COMMENT 'Account status',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time',
    last_login_at DATETIME NULL COMMENT 'Last login time',
    PRIMARY KEY (user_id),
    CONSTRAINT uq_users_username UNIQUE (username),
    KEY idx_users_role (role),
    KEY idx_users_status (status),
    KEY idx_users_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System users, including regular users, repairers, and administrators';

CREATE TABLE repair_orders (
    order_id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key for repair orders',
    user_id BIGINT NOT NULL COMMENT 'User who submitted the repair order',
    furniture_type VARCHAR(50) NOT NULL COMMENT 'Furniture or smart product type',
    fault_location VARCHAR(50) NOT NULL COMMENT 'Fault location',
    expected_time DATETIME NOT NULL COMMENT 'Expected repair time',
    address VARCHAR(255) NOT NULL COMMENT 'Repair address; sample data must be fictional',
    contact_phone VARCHAR(20) NOT NULL COMMENT 'Contact phone; sample data must be fictional',
    description TEXT NULL COMMENT 'Fault description',
    image_urls TEXT NULL COMMENT 'Comma-separated image URL list',
    status ENUM('PENDING', 'ASSIGNED', 'PROCESSING', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT 'Repair order status',
    assigned_to BIGINT NULL COMMENT 'Assigned repairer',
    handler_note TEXT NULL COMMENT 'Repair note or conclusion',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time',
    PRIMARY KEY (order_id),
    KEY idx_repair_orders_user_id (user_id),
    KEY idx_repair_orders_assigned_to (assigned_to),
    KEY idx_repair_orders_status (status),
    KEY idx_repair_orders_expected_time (expected_time),
    KEY idx_repair_orders_created_at (created_at),
    CONSTRAINT fk_repair_orders_user
        FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_repair_orders_assigned_to
        FOREIGN KEY (assigned_to)
        REFERENCES users (user_id)
        ON UPDATE RESTRICT
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Repair orders submitted by users and handled by repairers';

CREATE TABLE chat_history (
    chat_id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key for chat history records',
    user_id BIGINT NOT NULL COMMENT 'User associated with the conversation',
    session_id VARCHAR(64) NOT NULL COMMENT 'Conversation session ID',
    question TEXT NOT NULL COMMENT 'User question',
    answer TEXT NOT NULL COMMENT 'AI answer text',
    recalled_doc_ids TEXT NULL COMMENT 'Comma-separated recalled knowledge chunk IDs',
    is_rejected BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether the answer was refused',
    reject_reason VARCHAR(50) NULL COMMENT 'Refusal reason',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Conversation time',
    PRIMARY KEY (chat_id),
    KEY idx_chat_history_user_id (user_id),
    KEY idx_chat_history_session_id (session_id),
    KEY idx_chat_history_created_at (created_at),
    KEY idx_chat_history_is_rejected (is_rejected),
    CONSTRAINT fk_chat_history_user
        FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User AI conversation records for audit, tracing, and quality analysis';

CREATE TABLE repairer_logs (
    log_id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key for repairer operation logs',
    repairer_id BIGINT NOT NULL COMMENT 'Repairer who performed the operation',
    action_type ENUM('LOGIN', 'LOGOUT', 'VIEW_ORDER', 'ACCEPT_ORDER', 'UPDATE_STATUS', 'ADD_NOTE') NOT NULL COMMENT 'Operation type',
    target_order_id BIGINT NULL COMMENT 'Related repair order',
    action_detail VARCHAR(255) NULL COMMENT 'Operation detail or change summary',
    ip_address VARCHAR(45) NULL COMMENT 'Client IP address',
    user_agent VARCHAR(255) NULL COMMENT 'Browser or device information',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Operation time',
    PRIMARY KEY (log_id),
    KEY idx_repairer_logs_repairer_id (repairer_id),
    KEY idx_repairer_logs_action_type (action_type),
    KEY idx_repairer_logs_target_order_id (target_order_id),
    KEY idx_repairer_logs_created_at (created_at),
    CONSTRAINT fk_repairer_logs_repairer
        FOREIGN KEY (repairer_id)
        REFERENCES users (user_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_repairer_logs_target_order
        FOREIGN KEY (target_order_id)
        REFERENCES repair_orders (order_id)
        ON UPDATE RESTRICT
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Repairer operation logs for audit and traceability';

CREATE TABLE knowledge_chunks (
    content_id VARCHAR(64) NOT NULL COMMENT 'Global unique knowledge chunk ID',
    parent_id VARCHAR(64) NULL COMMENT 'Parent chapter or section ID for hierarchy tracing',
    chunk_text TEXT NOT NULL COMMENT 'Knowledge chunk text',
    product_model VARCHAR(50) NOT NULL COMMENT 'Product model',
    chapter VARCHAR(100) NOT NULL COMMENT 'Chapter path',
    content_type VARCHAR(30) NOT NULL COMMENT 'Content type, such as manual section, safety warning, troubleshooting, or QA',
    source_file VARCHAR(200) NULL COMMENT 'Source file name',
    version VARCHAR(20) NOT NULL COMMENT 'Content version',
    created_by BIGINT NULL COMMENT 'Maintainer user ID',
    review_status ENUM('DRAFT', 'REVIEWED', 'PUBLISHED', 'DEPRECATED') NOT NULL DEFAULT 'DRAFT' COMMENT 'Review status',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time',
    PRIMARY KEY (content_id),
    KEY idx_knowledge_chunks_parent_id (parent_id),
    KEY idx_knowledge_chunks_product_model (product_model),
    KEY idx_knowledge_chunks_chapter (chapter),
    KEY idx_knowledge_chunks_content_type (content_type),
    KEY idx_knowledge_chunks_version (version),
    KEY idx_knowledge_chunks_review_status (review_status),
    KEY idx_knowledge_chunks_created_by (created_by),
    CONSTRAINT fk_knowledge_chunks_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (user_id)
        ON UPDATE RESTRICT
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Knowledge chunks for future RAG retrieval and citation tracing; no vectors stored';
