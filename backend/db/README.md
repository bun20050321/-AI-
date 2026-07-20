# 数据库初始化说明

项目目录：`E:\AI_RAG`

本目录用于保存 MySQL 数据库初始化脚本和非敏感演示数据。当前阶段只完成数据库表结构、演示数据和连接检查，不实现业务 CRUD、登录注册、维修工单流转、RAG 检索、Embedding、LLM 调用或前端页面。

## 1. 文件说明

| 文件 | 说明 |
| --- | --- |
| `E:\AI_RAG\backend\db\init.sql` | MySQL 建表脚本，创建 5 张核心表、主键、外键、唯一约束和索引 |
| `E:\AI_RAG\backend\db\demo-data.sql` | 非敏感演示数据，用于验证外键关系和最低数据量 |
| `E:\AI_RAG\scripts\check_db_connection.py` | 数据库连接检查脚本 |
| `E:\AI_RAG\.env.example` | 环境变量示例，不包含真实密码 |

## 2. 创建 MySQL 数据库

进入 MySQL：

```powershell
& "E:\MySQL\MySQL Workbench 8.0\mysql.exe" -u root -p
```

输入本机 MySQL 密码后，执行：

```sql
CREATE DATABASE IF NOT EXISTS ai_rag
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

确认数据库存在：

```sql
SHOW DATABASES;
```

## 3. 执行建表脚本

方式一：在 PowerShell 中执行：

```powershell
& "E:\MySQL\MySQL Workbench 8.0\mysql.exe" -u root -p ai_rag < E:\AI_RAG\backend\db\init.sql
```

方式二：进入 MySQL 后执行：

```sql
USE ai_rag;
SOURCE E:/AI_RAG/backend/db/init.sql;
```

预期结果：

- 创建 `users` 表。
- 创建 `repair_orders` 表。
- 创建 `chat_history` 表。
- 创建 `repairer_logs` 表。
- 创建 `knowledge_chunks` 表。
- 建立主键、外键、唯一约束和必要索引。

检查表：

```sql
USE ai_rag;
SHOW TABLES;
```

预期返回：

```text
chat_history
knowledge_chunks
repair_orders
repairer_logs
users
```

## 4. 执行演示数据脚本

PowerShell：

```powershell
& "E:\MySQL\MySQL Workbench 8.0\mysql.exe" -u root -p ai_rag < E:\AI_RAG\backend\db\demo-data.sql
```

MySQL 内部：

```sql
USE ai_rag;
SOURCE E:/AI_RAG/backend/db/demo-data.sql;
```

预期结果：

| 表 | 最低预期数量 |
| --- | ---: |
| `users` | 3 |
| `repair_orders` | 5 |
| `chat_history` | 5 |
| `repairer_logs` | 5 |
| `knowledge_chunks` | 8 |

检查数量：

```sql
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'repair_orders', COUNT(*) FROM repair_orders
UNION ALL SELECT 'chat_history', COUNT(*) FROM chat_history
UNION ALL SELECT 'repairer_logs', COUNT(*) FROM repairer_logs
UNION ALL SELECT 'knowledge_chunks', COUNT(*) FROM knowledge_chunks;
```

## 5. 配置环境变量

连接配置通过环境变量读取，不要把真实密码写入项目文件。

PowerShell 临时配置：

```powershell
$env:DB_HOST="localhost"
$env:DB_PORT="3306"
$env:DB_NAME="ai_rag"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="你的本机密码"
```

说明：

- 临时环境变量只在当前 PowerShell 窗口有效。
- 不建议把真实密码永久写入系统环境变量。
- `.env.example` 只能保留占位值。

## 6. 运行数据库连接检查

确认环境变量已配置后执行：

```powershell
python E:\AI_RAG\scripts\check_db_connection.py
```

预期结果：

- 能连接 MySQL。
- 输出数据库名称。
- 输出数据库版本。
- 输出当前数据库时间。
- 5 张关键表均存在。
- 示例数据数量达到最低要求。
- 密码在输出中显示为 `***`。

成功时应看到：

```text
Result: success
```

## 7. 常见失败原因

### MySQL 服务未启动

现象：

- 连接超时。
- 无法连接到 `localhost:3306`。

处理：

- 打开 Windows 服务，确认 `MySQL80` 正在运行。
- 或在命令行检查服务状态。

### 数据库不存在

现象：

```text
ERROR 1049 (42000): Unknown database 'ai_rag'
```

处理：

```sql
CREATE DATABASE IF NOT EXISTS ai_rag
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

### 账号或密码错误

现象：

```text
ERROR 1045 (28000): Access denied
```

处理：

- 确认 `DB_USERNAME` 正确。
- 确认 `DB_PASSWORD` 是真实本机密码，不是 `你的本机密码` 这类说明文字。
- 在 MySQL Workbench 或 CLI 中单独验证账号密码。

### 用户权限不足

现象：

- 无法创建表。
- 无法创建索引。
- 无法插入演示数据。

处理：

- 使用具备建表权限的账号执行初始化。
- 或为项目账号授权目标数据库权限。

### 表未创建

现象：

- 连接检查提示 `missing table`。
- `SHOW TABLES` 看不到 5 张核心表。

处理：

```powershell
& "E:\MySQL\MySQL Workbench 8.0\mysql.exe" -u root -p ai_rag < E:\AI_RAG\backend\db\init.sql
```

### 示例数据未导入

现象：

- 表存在，但连接检查提示数量不足。

处理：

```powershell
& "E:\MySQL\MySQL Workbench 8.0\mysql.exe" -u root -p ai_rag < E:\AI_RAG\backend\db\demo-data.sql
```

### 连接端口错误

现象：

- 连接超时。
- 连接被拒绝。

处理：

- 确认 MySQL 实际端口，通常为 `3306`。
- 确认 `DB_PORT=3306`。

### 环境变量未生效

现象：

- 脚本读取不到 `DB_PASSWORD`。
- 修改环境变量后脚本仍使用旧值。

处理：

- 在同一个 PowerShell 窗口中设置环境变量并运行脚本。
- 如果使用永久环境变量，重新打开 PowerShell。
- 使用 `echo $env:DB_NAME` 等命令确认当前值。

## 8. 边界确认

当前阶段只完成：

- MySQL 建表脚本。
- 非敏感演示数据。
- Spring Boot 风格数据库连接配置占位。
- 数据库连接检查脚本。
- 初始化说明。

当前阶段不实现：

- 业务 CRUD。
- 登录注册接口。
- 维修工单新增、查询、修改、删除接口。
- 派单、接单、完成、拒绝等状态流转逻辑。
- 聊天问答接口。
- RAG 检索。
- Embedding 生成。
- 向量数据库接入。
- LLM 调用。
- 前端页面。
