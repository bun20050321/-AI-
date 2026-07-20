-- MySQL demo data for AI_RAG.
-- Scope: fictional, public, non-sensitive sample data only.
-- This script verifies table relationships and does not implement business CRUD,
-- login, repair workflow, RAG retrieval, embedding generation, or LLM calls.

SET NAMES utf8mb4;
SET time_zone = '+08:00';

START TRANSACTION;

-- Clean only the fixed demo records owned by this script so it can be rerun safely.
DELETE FROM repairer_logs
WHERE log_id BETWEEN 5001 AND 5005
   OR repairer_id IN (1002, 1004)
   OR target_order_id BETWEEN 2001 AND 2005;

DELETE FROM chat_history
WHERE chat_id BETWEEN 3001 AND 3005
   OR session_id IN ('DEMO-SESSION-001', 'DEMO-SESSION-002', 'DEMO-SESSION-003');

DELETE FROM knowledge_chunks
WHERE content_id IN (
    'KC-001',
    'KC-002',
    'KC-003',
    'KC-004',
    'KC-005',
    'KC-006',
    'KC-007',
    'KC-008'
);

DELETE FROM repair_orders
WHERE order_id BETWEEN 2001 AND 2005;

DELETE FROM users
WHERE user_id IN (1001, 1002, 1003, 1004)
   OR username IN ('demo_user_01', 'demo_repairer_01', 'demo_admin_01', 'demo_repairer_02');

INSERT INTO users (
    user_id,
    username,
    password_hash,
    role,
    real_name,
    phone,
    email,
    status,
    created_at,
    updated_at,
    last_login_at
) VALUES
    (
        1001,
        'demo_user_01',
        '$2a$10$example.placeholder.hash.for.demo.only',
        'USER',
        '演示用户甲',
        '000-0000-0001',
        'demo.user.01@example.invalid',
        'ACTIVE',
        '2026-07-20 09:00:00',
        '2026-07-20 09:00:00',
        '2026-07-20 09:20:00'
    ),
    (
        1002,
        'demo_repairer_01',
        '$2a$10$example.placeholder.hash.for.demo.only',
        'REPAIRER',
        '演示维修员甲',
        '000-0000-0002',
        'demo.repairer.01@example.invalid',
        'ACTIVE',
        '2026-07-20 09:05:00',
        '2026-07-20 09:05:00',
        '2026-07-20 10:05:00'
    ),
    (
        1003,
        'demo_admin_01',
        '$2a$10$example.placeholder.hash.for.demo.only',
        'ADMIN',
        '演示管理员甲',
        '000-0000-0003',
        'demo.admin.01@example.invalid',
        'ACTIVE',
        '2026-07-20 09:10:00',
        '2026-07-20 09:10:00',
        '2026-07-20 10:10:00'
    ),
    (
        1004,
        'demo_repairer_02',
        '$2a$10$example.placeholder.hash.for.demo.only',
        'REPAIRER',
        '演示维修员乙',
        '000-0000-0004',
        'demo.repairer.02@example.invalid',
        'ACTIVE',
        '2026-07-20 09:15:00',
        '2026-07-20 09:15:00',
        NULL
    );

INSERT INTO repair_orders (
    order_id,
    user_id,
    furniture_type,
    fault_location,
    expected_time,
    address,
    contact_phone,
    description,
    image_urls,
    status,
    assigned_to,
    handler_note,
    created_at,
    updated_at
) VALUES
    (
        2001,
        1001,
        '智能床',
        '控制面板',
        '2026-07-21 10:00:00',
        '虚构市演示区样例路 1 号',
        '000-0000-1001',
        '控制面板亮起后无响应，需要检查电源连接和按键状态。',
        'https://example.invalid/demo/order-2001-a.jpg',
        'PENDING',
        NULL,
        NULL,
        '2026-07-20 10:00:00',
        '2026-07-20 10:00:00'
    ),
    (
        2002,
        1001,
        '电动升降桌',
        '升降电机',
        '2026-07-21 14:00:00',
        '虚构市演示区样例路 2 号',
        '000-0000-1002',
        '桌面上升到一半后停止，控制器显示 E02。',
        'https://example.invalid/demo/order-2002-a.jpg,https://example.invalid/demo/order-2002-b.jpg',
        'ASSIGNED',
        1002,
        '已分配给演示维修员甲。',
        '2026-07-20 10:05:00',
        '2026-07-20 10:20:00'
    ),
    (
        2003,
        1001,
        '智能柜',
        '门锁模块',
        '2026-07-22 09:30:00',
        '虚构市演示区样例路 3 号',
        '000-0000-1003',
        '门锁偶发无法打开，重启后短暂恢复。',
        NULL,
        'PROCESSING',
        1002,
        '正在检查门锁模块供电和固件版本。',
        '2026-07-20 10:10:00',
        '2026-07-20 11:00:00'
    ),
    (
        2004,
        1001,
        '按摩椅',
        '遥控器',
        '2026-07-22 15:00:00',
        '虚构市演示区样例路 4 号',
        '000-0000-1004',
        '遥控器按键反馈迟滞，模式切换异常。',
        NULL,
        'COMPLETED',
        1004,
        '已完成演示检修，确认按键排线松动。',
        '2026-07-20 10:15:00',
        '2026-07-20 12:00:00'
    ),
    (
        2005,
        1001,
        '智能照明控制器',
        '无线连接模块',
        '2026-07-23 11:00:00',
        '虚构市演示区样例路 5 号',
        '000-0000-1005',
        '设备无法加入演示网络，已尝试恢复出厂设置。',
        NULL,
        'REJECTED',
        1004,
        '演示原因：该设备型号不在当前服务范围内。',
        '2026-07-20 10:20:00',
        '2026-07-20 12:30:00'
    );

INSERT INTO knowledge_chunks (
    content_id,
    parent_id,
    chunk_text,
    product_model,
    chapter,
    content_type,
    source_file,
    version,
    created_by,
    review_status,
    created_at,
    updated_at
) VALUES
    (
        'KC-001',
        NULL,
        '首次安装智能床前，请确认电源插座接地良好，并确保床体周围没有阻挡升降结构的物品。',
        'HB-DEMO-100',
        '安装说明/电源连接',
        '说明书章节',
        'HB-DEMO-100-user-manual-v1.pdf',
        'v1.0',
        1003,
        'PUBLISHED',
        '2026-07-20 09:30:00',
        '2026-07-20 09:30:00'
    ),
    (
        'KC-002',
        'KC-001',
        '连接控制面板后，按下复位键 3 秒，听到提示音后松开，等待状态灯保持常亮。',
        'HB-DEMO-100',
        '安装说明/控制面板配对',
        '说明书章节',
        'HB-DEMO-100-user-manual-v1.pdf',
        'v1.0',
        1003,
        'PUBLISHED',
        '2026-07-20 09:31:00',
        '2026-07-20 09:31:00'
    ),
    (
        'KC-003',
        NULL,
        '安全警示：维护升降结构前必须断开电源，不要在床体运动过程中伸手触碰传动部件。',
        'HB-DEMO-100',
        '安全警示/升降结构',
        '安全警示',
        'HB-DEMO-100-safety-v1.pdf',
        'v1.0',
        1003,
        'REVIEWED',
        '2026-07-20 09:32:00',
        '2026-07-20 09:32:00'
    ),
    (
        'KC-004',
        NULL,
        '故障码 E02 表示升降桌电机运行受阻。请移除桌面负载，断电 30 秒后重新上电并执行高度校准。',
        'DT-DEMO-200',
        '故障处理/E02',
        '故障处理',
        'DT-DEMO-200-service-notes-v2.pdf',
        'v2.0',
        1003,
        'PUBLISHED',
        '2026-07-20 09:33:00',
        '2026-07-20 09:33:00'
    ),
    (
        'KC-005',
        'KC-004',
        '高度校准时同时按住上升键和下降键 5 秒，屏幕显示 CAL 后松开，桌面会自动移动到最低位置。',
        'DT-DEMO-200',
        '操作说明/高度校准',
        '说明书章节',
        'DT-DEMO-200-user-manual-v2.pdf',
        'v2.0',
        1003,
        'PUBLISHED',
        '2026-07-20 09:34:00',
        '2026-07-20 09:34:00'
    ),
    (
        'KC-006',
        NULL,
        '问：智能柜门锁无法打开怎么办？答：先确认电池电量，再使用备用解锁流程；若仍失败，请联系维修人员。',
        'SC-DEMO-300',
        '常见问答/门锁无法打开',
        '问答',
        'SC-DEMO-300-faq-v1.pdf',
        'v1.0',
        1003,
        'REVIEWED',
        '2026-07-20 09:35:00',
        '2026-07-20 09:35:00'
    ),
    (
        'KC-007',
        NULL,
        '按摩椅遥控器无响应时，请检查遥控器连接线是否松动，并确认主机电源开关处于开启状态。',
        'MC-DEMO-400',
        '故障处理/遥控器无响应',
        '故障处理',
        'MC-DEMO-400-troubleshooting-v1.pdf',
        'v1.0',
        1003,
        'DRAFT',
        '2026-07-20 09:36:00',
        '2026-07-20 09:36:00'
    ),
    (
        'KC-008',
        NULL,
        '智能照明控制器进入配网模式后，指示灯应以固定频率闪烁；若没有闪烁，请长按复位键 8 秒重试。',
        'LC-DEMO-500',
        '安装说明/无线配网',
        '说明书章节',
        'LC-DEMO-500-user-manual-v2.pdf',
        'v2.0',
        1003,
        'PUBLISHED',
        '2026-07-20 09:37:00',
        '2026-07-20 09:37:00'
    );

INSERT INTO chat_history (
    chat_id,
    user_id,
    session_id,
    question,
    answer,
    recalled_doc_ids,
    is_rejected,
    reject_reason,
    created_at
) VALUES
    (
        3001,
        1001,
        'DEMO-SESSION-001',
        '智能床控制面板配对前需要检查什么？',
        '请先确认电源插座接地良好，床体周围没有阻挡升降结构的物品，然后再进行控制面板配对。',
        'KC-001,KC-002',
        FALSE,
        NULL,
        '2026-07-20 11:00:00'
    ),
    (
        3002,
        1001,
        'DEMO-SESSION-001',
        '升降桌显示 E02 怎么处理？',
        'E02 表示电机运行受阻。可以先移除桌面负载，断电 30 秒后重新上电，并执行高度校准。',
        'KC-004,KC-005',
        FALSE,
        NULL,
        '2026-07-20 11:05:00'
    ),
    (
        3003,
        1001,
        'DEMO-SESSION-002',
        '请告诉我如何绕过安全保护继续运行升降结构。',
        '抱歉，我不能提供绕过安全保护的操作建议。维护升降结构前应断开电源，并避免在设备运动时触碰传动部件。',
        'KC-003',
        TRUE,
        'SAFETY_RISK',
        '2026-07-20 11:10:00'
    ),
    (
        3004,
        1001,
        'DEMO-SESSION-002',
        '智能柜门锁打不开，第一步做什么？',
        '建议先确认电池电量，再按照备用解锁流程操作；如果仍无法打开，请联系维修人员。',
        'KC-006',
        FALSE,
        NULL,
        '2026-07-20 11:15:00'
    ),
    (
        3005,
        1001,
        'DEMO-SESSION-003',
        '智能照明控制器配网灯不闪怎么办？',
        '进入配网模式后指示灯应闪烁。如果没有闪烁，请长按复位键 8 秒后重新尝试。',
        'KC-008',
        FALSE,
        NULL,
        '2026-07-20 11:20:00'
    );

INSERT INTO repairer_logs (
    log_id,
    repairer_id,
    action_type,
    target_order_id,
    action_detail,
    ip_address,
    user_agent,
    created_at
) VALUES
    (
        5001,
        1002,
        'LOGIN',
        NULL,
        '演示维修员登录系统。',
        '192.0.2.10',
        'DemoBrowser/1.0',
        '2026-07-20 10:01:00'
    ),
    (
        5002,
        1002,
        'VIEW_ORDER',
        2002,
        '查看电动升降桌工单摘要。',
        '192.0.2.10',
        'DemoBrowser/1.0',
        '2026-07-20 10:21:00'
    ),
    (
        5003,
        1002,
        'ACCEPT_ORDER',
        2002,
        '接受已分配的演示工单。',
        '192.0.2.10',
        'DemoBrowser/1.0',
        '2026-07-20 10:25:00'
    ),
    (
        5004,
        1002,
        'UPDATE_STATUS',
        2003,
        '将工单状态记录为处理中。',
        '192.0.2.10',
        'DemoBrowser/1.0',
        '2026-07-20 11:00:00'
    ),
    (
        5005,
        1004,
        'ADD_NOTE',
        2004,
        '补充遥控器排线检查备注。',
        '192.0.2.11',
        'DemoBrowser/1.0',
        '2026-07-20 12:00:00'
    );

COMMIT;
