# 维修工单接口 curl 测试命令

当前项目默认后端地址为 `http://localhost:8081`。如果后端使用其他端口，请替换下面命令中的地址。

## 1. 健康检查

用于验证后端服务是否正常启动并可以响应 HTTP 请求。

```bash
curl.exe -i "http://localhost:8081/api/health"
```

## 2. 数据库连接检查

用于验证后端是否可以正常连接数据库，并检查数据库探活接口是否可用。

```bash
curl.exe -i "http://localhost:8081/api/db/ping"
```

## 3. 新增维修工单

用于验证维修工单新增接口、请求参数校验和数据库写入功能。请求体使用 `G01` 示例数据。

```powershell
curl.exe -i -X POST "http://localhost:8081/api/repair-orders" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json" `
  -d '{"group_code":"G01","equipment_name":"G01空压机","fault_title":"设备无法启动","fault_desc":"按下启动按钮后设备无响应。"}'
```

如果在 Git Bash、Linux 或 macOS 中执行，请使用下面的写法：

```bash
curl -i -X POST "http://localhost:8081/api/repair-orders" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"group_code":"G01","equipment_name":"G01空压机","fault_title":"设备无法启动","fault_desc":"按下启动按钮后设备无响应。"}'
```

## 4. 分页查询维修工单

用于验证维修工单分页查询，以及查询条件组合功能：`group_code` 精确匹配，`equipment_name` 和 `fault_title` 模糊匹配。

```bash
curl.exe -i "http://localhost:8081/api/repair-orders?pageNum=1&pageSize=10&group_code=G01&equipment_name=空压机&fault_title=启动"
```

## 5. 查询维修工单详情

用于验证根据工单 ID 查询详情的功能。下面使用示例 ID `1`，请根据新增接口实际返回的工单 ID 替换 `1`。

```bash
curl.exe -i "http://localhost:8081/api/repair-orders/1"
```
