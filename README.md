
# AI 智能助手 - RAG 知识库系统

基于 RAG（检索增强生成）技术的智能问答系统，包含前端界面和后端 API 服务。

---

## 📋 项目简介

本项目是一个完整的 RAG 知识库应用，支持文档上传与解析、向量检索与智能问答功能。前后端分离架构，便于开发和部署。

---

## 🛠️ 技术栈

### 后端
- Java 17
- Spring Boot 3.4.6
- Maven

### 前端
- Vue 3
- Vite 7
- Axios
- Node.js 18+

---

## 🚀 快速开始

### 前置要求

- Java 17 或更高版本
- Maven 3.6+
- Node.js 18+ 和 npm

### 1. 克隆项目

```bash
git clone https://github.com/bun20050321/-AI-.git
cd -AI-
```

### 2. 启动后端

```bash
cd backend/rag-kb-demo
mvn clean install
mvn spring-boot:run
```

后端默认运行在：`http://localhost:8080`

### 3. 启动前端

**新开一个命令行窗口**，执行：

```bash
cd frontend/rag-kb-web
npm install
npm run dev
```

前端默认运行在：`http://localhost:5173`

### 4. 访问系统

打开浏览器访问：`http://localhost:5173`

---

## 📁 项目结构

```
-AI-/
├── backend/
│   └── rag-kb-demo/
│       ├── src/main/java/com/eos/ragkbdemo/
│       │   ├── config/
│       │   │   └── CorsConfig.java
│       │   └── controller/
│       │       └── ApplianceController.java
│       └── pom.xml
├── frontend/
│   └── rag-kb-web/
│       ├── src/
│       │   ├── api/
│       │   │   └── health.js
│       │   └── ...
│       ├── .env
│       ├── package.json
│       └── vite.config.js
└── docs/
```

---

## 🔧 配置说明

### 修改后端端口

```bash
mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8081
```

### 修改前端 API 地址

编辑 `frontend/rag-kb-web/.env`：

```
VITE_API_URL=http://localhost:8080
```

修改后重启前端：

```bash
npm run dev
```

### 跨域配置

跨域问题已通过 `CorsConfig.java` 解决，允许来自 `http://localhost:5173` 的请求。

如需添加其他域名，修改 `CorsConfig.java`：

```java
.allowedOrigins("http://localhost:5173", "https://your-domain.com")
```

---

## 🧪 测试接口

后端启动后，访问：

```
http://localhost:8080/api/appliance
```

预期返回：

```json
{"status":"ok"}
```

---

## ❓ 常见问题

### Q1: 前端显示"无法连接网络"

- 检查后端是否已启动
- 检查后端端口是否为 8080
- 检查 `.env` 中的 `VITE_API_URL` 是否正确

### Q2: 跨域（CORS）报错

- 确认 `CorsConfig.java` 文件存在
- 确认前后端端口配置一致
- 重新编译启动后端

### Q3: 端口被占用

```bash
netstat -ano | findstr :8080
taskkill /PID 进程号 /F
```

### Q4: Maven 命令找不到

- 安装 Maven 并配置环境变量
- 或使用 IDE 内置 Maven

### Q5: npm install 失败

```bash
npm config set registry https://registry.npmmirror.com
npm install
```

---

## 📝 更新日志

### 2026-07-18

- 修复 CORS 跨域问题，添加 `CorsConfig.java`
- 修改前端 API 请求路径从 `/api/health` 改为 `/api/appliance`
- 更新 `.env` 环境变量配置

---

## 📄 许可证

MIT License

---

## 📧 联系方式

如有问题，请提交 Issue 或联系项目维护者。
```

---

## 使用步骤

1. **全选上面所有内容**（从 `# AI 智能助手` 到 `联系项目维护者`）
2. **按 Ctrl + C 复制**
3. 去 GitHub 仓库页面，点击 **Add file** → **Create new file**
4. 文件名输入 `README.md`
5. **按 Ctrl + V 粘贴**
6. 点击 **Commit new file**
