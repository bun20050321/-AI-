CREATE TABLE IF NOT EXISTS database_connection_checks (
    id BIGINT NOT NULL AUTO_INCREMENT,
    status VARCHAR(16) NOT NULL,
    checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT chk_database_connection_checks_status CHECK (status IN ('ok', 'failed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eos_repair_order (
    id BIGINT NOT NULL AUTO_INCREMENT,
    group_code VARCHAR(32) DEFAULT NULL,
    equipment_name VARCHAR(255) NOT NULL,
    fault_title VARCHAR(255) NOT NULL,
    fault_desc TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_eos_repair_order_group_code (group_code),
    KEY idx_eos_repair_order_equipment_name (equipment_name),
    KEY idx_eos_repair_order_fault_title (fault_title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
