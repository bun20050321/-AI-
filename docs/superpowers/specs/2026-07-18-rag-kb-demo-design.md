# rag-kb-demo Backend Design

## Goal

为电器介绍检索增强生成知识库实训项目创建一个最小化的 Java 17 Spring Boot 后端。应用必须能够构建，并提供一个占位的电器介绍 AI 接口。

## Project Layout

The Maven project will live at `backend/rag-kb-demo` with these coordinates:

- Group ID: `com.eos`
- Artifact ID: `rag-kb-demo`
- Java version: 17

The application package root is `com.eos.ragkbdemo`. It will contain `controller`, `service`, `mapper`, `entity`, `dto`, `vo`, and `config` packages. Packages without current behavior will contain package documentation only, avoiding speculative business classes.

## Dependencies

Maven will use Spring Boot dependency management plus the Spring AI BOM. The initial dependencies are Spring Web, Validation, MyBatis-Plus, MySQL Connector/J, Spring AI's OpenAI starter, the Elasticsearch Java client, Lombok, and Spring Boot Test.

No database, OpenAI, or Elasticsearch connection will be configured at this stage. This keeps the starter application runnable without external infrastructure.

## API

`GET /api/appliance` returns HTTP 200 with this exact JSON body:

```json
{"status":"ok"}
```

`ApplianceController` owns this endpoint and has no service dependency because it is intentionally a placeholder. Future AI retrieval logic can be introduced behind a service interface without changing the endpoint contract.

## Testing And Verification

An MVC test will be written before the controller. It will assert the route, HTTP 200 response, JSON content type, and `status` value. The test must first fail because the controller does not exist, then pass after the minimal implementation is added.

正常验证命令为 `mvn test`。最终验证会在已配置 Java 17 和 Maven 的环境中运行 Maven 测试并打包项目。

## Scope Boundaries

This iteration creates only the application skeleton and the static appliance endpoint. It does not add database tables, mappers, retrieval logic, OpenAI calls, Elasticsearch operations, CRUD endpoints, or business DTOs and VOs.
