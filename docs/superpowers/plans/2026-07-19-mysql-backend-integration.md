# MySQL Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the Spring Boot backend to the local MySQL 8.0 service and expose a uniform, diagnosable `GET /api/db/ping` endpoint.

**Architecture:** Enable Spring Boot JDBC datasource auto-configuration with MySQL environment variables. Add a small `ApiResponse<T>` record and a `DbController` that uses `JdbcTemplate` for `SELECT CURRENT_TIMESTAMP`; keep repair and chat flows in memory. Put a MySQL 8 initialization script under backend resources and make its execution opt-in through `DB_INIT_MODE`.

**Tech Stack:** Spring Boot 3.4.6, Java 17, MySQL Connector/J, Spring JDBC, MyBatis-Plus 3.5.11, MockMvc, JUnit 5.

## Global Constraints

- Use MySQL 8 SQL syntax for the new backend-owned script.
- Read `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` from environment variables; do not add a real password to source control.
- Keep the existing root PostgreSQL scripts unchanged.
- Keep repair/chat behavior unchanged and in memory.
- Return HTTP 503 with a clear sanitized message when the database ping fails.
- Do not add Flyway, Liquibase, entities, mappers, or business CRUD.

---

### Task 1: Add Failing Database Ping MVC Tests

**Files:**

- Create: `backend/rag-kb-demo/src/test/java/com/eos/ragkbdemo/controller/DbControllerTest.java`

**Interfaces:**

- Consumes: `DbController` and `JdbcTemplate` once production code exists.
- Produces: Assertions for `GET /api/db/ping` success and failure contracts.

- [ ] **Step 1: Write the success and failure tests first**

```java
package com.eos.ragkbdemo.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.sql.Timestamp;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DbController.class)
class DbControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JdbcTemplate jdbcTemplate;

    @Test
    void pingReturnsCurrentDatabaseTime() throws Exception {
        when(jdbcTemplate.queryForObject(eq("SELECT CURRENT_TIMESTAMP"), eq(Timestamp.class)))
                .thenReturn(Timestamp.valueOf("2026-07-19 12:34:56"));

        mockMvc.perform(get("/api/db/ping"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.databaseTime").value("2026-07-19T12:34:56"))
                .andExpect(jsonPath("$.message").value("Database connection is healthy"));
    }

    @Test
    void pingReturnsClearServiceUnavailableResponseWhenDatabaseFails() throws Exception {
        when(jdbcTemplate.queryForObject(eq("SELECT CURRENT_TIMESTAMP"), eq(Timestamp.class)))
                .thenThrow(new IllegalStateException("Communications link failure"));

        mockMvc.perform(get("/api/db/ping"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.message").value("Database connection failed: Communications link failure"));
    }
}
```

- [ ] **Step 2: Run the focused test and verify the expected RED failure**

Run from `backend/rag-kb-demo`:

```powershell
mvn.cmd -Dtest=DbControllerTest test
```

Expected: compilation failure because `DbController` does not exist yet.

### Task 2: Add the Response and Controller Implementation

**Files:**

- Create: `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/vo/ApiResponse.java`
- Create: `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/controller/DbController.java`

**Interfaces:**

- Consumes: `JdbcTemplate` and `GET /api/db/ping`.
- Produces: `ApiResponse<Map<String, String>>` with database time or `ApiResponse<Void>` failure.

- [ ] **Step 1: Add the smallest generic response record**

```java
package com.eos.ragkbdemo.vo;

public record ApiResponse<T>(boolean success, T data, String message) {
    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, data, message);
    }

    public static <T> ApiResponse<T> failure(String message) {
        return new ApiResponse<>(false, null, message);
    }
}
```

- [ ] **Step 2: Implement the controller against the failing test**

```java
package com.eos.ragkbdemo.controller;

import com.eos.ragkbdemo.vo.ApiResponse;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/db")
public class DbController {

    private static final String CURRENT_TIMESTAMP_SQL = "SELECT CURRENT_TIMESTAMP";

    private final JdbcTemplate jdbcTemplate;

    public DbController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/ping")
    public ResponseEntity<ApiResponse<Map<String, String>>> ping() {
        try {
            Timestamp databaseTime = jdbcTemplate.queryForObject(CURRENT_TIMESTAMP_SQL, Timestamp.class);
            String formattedTime = databaseTime == null ? null : databaseTime.toLocalDateTime().toString();
            return ResponseEntity.ok(ApiResponse.success(
                    Map.of("databaseTime", formattedTime),
                    "Database connection is healthy"));
        } catch (DataAccessException | RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.failure("Database connection failed: " + exception.getMessage()));
        }
    }
}
```

- [ ] **Step 3: Run the focused test and verify GREEN**

Run:

```powershell
mvn.cmd -Dtest=DbControllerTest test
```

Expected: 2 tests pass.

### Task 3: Enable MySQL and MyBatis-Plus Configuration

**Files:**

- Modify: `backend/rag-kb-demo/pom.xml`
- Modify: `backend/rag-kb-demo/src/main/resources/application.yml`
- Modify: `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/RagKbDemoApplication.java`

**Interfaces:**

- Consumes: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and optional `DB_INIT_MODE` environment variables.
- Produces: Spring `DataSource`, `JdbcTemplate`, and MyBatis-Plus base settings.

- [ ] **Step 1: Add explicit Spring JDBC support and keep the MySQL runtime driver**

Add this dependency to `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jdbc</artifactId>
</dependency>
```

- [ ] **Step 2: Replace the disabled datasource configuration**

Remove `DataSourceAutoConfiguration.class` from `@SpringBootApplication` and add this YAML:

```yaml
spring:
  datasource:
    url: ${DB_URL:jdbc:mysql://127.0.0.1:3306/rag_kb?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf8}
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:}
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      connection-timeout: ${DB_CONNECTION_TIMEOUT_MS:3000}
  sql:
    init:
      mode: ${DB_INIT_MODE:never}
      schema-locations: classpath:db/init.sql
      continue-on-error: false

mybatis-plus:
  mapper-locations: classpath*:/mapper/**/*.xml
  type-aliases-package: com.eos.ragkbdemo.entity
  configuration:
    map-underscore-to-camel-case: true
  global-config:
    db-config:
      id-type: auto
```

- [ ] **Step 3: Register the mapper scan base package**

Add `@MapperScan("com.eos.ragkbdemo.mapper")` to `RagKbDemoApplication`.

- [ ] **Step 4: Run the focused and application tests**

Run:

```powershell
mvn.cmd test
```

Expected: the project compiles and the focused database tests remain green. Tests must not require a live MySQL password because the controller test supplies a mocked `JdbcTemplate`.

### Task 4: Add MySQL Initialization SQL and Resolve CORS

**Files:**

- Create: `backend/rag-kb-demo/src/main/resources/db/init.sql`
- Modify: `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/controller/ApiController.java`
- Modify: `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/controller/HomeController.java`

**Interfaces:**

- Consumes: `DB_INIT_MODE=always` when the application should initialize the schema.
- Produces: A MySQL 8-compatible `database_connection_checks` table and compatible web CORS behavior.

- [ ] **Step 1: Add the minimal MySQL 8 initialization script**

```sql
CREATE TABLE IF NOT EXISTS database_connection_checks (
    id BIGINT NOT NULL AUTO_INCREMENT,
    status VARCHAR(16) NOT NULL,
    checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT chk_database_connection_checks_status CHECK (status IN ('ok', 'failed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- [ ] **Step 2: Remove controller-level wildcard CORS annotations**

Remove `@CrossOrigin(origins = "*")` from `ApiController` and `HomeController`. The existing `CorsConfig` already allows the frontend origin with credentials and becomes the single CORS policy.

- [ ] **Step 3: Run the backend suite**

Run:

```powershell
mvn.cmd test
```

Expected: all backend tests pass.

### Task 5: Verify Configuration and Optional Live MySQL Connection

**Files:**

- Modify: `README.md` only if the existing setup instructions do not document the new environment variables.

- [ ] **Step 1: Check the new files and configuration for hardcoded credentials**

Run:

```powershell
rg -n "DB_URL|DB_USERNAME|DB_PASSWORD|DB_INIT_MODE|jdbc:mysql|password:" backend/rag-kb-demo/src/main/resources backend/rag-kb-demo/src/main/java backend/rag-kb-demo/pom.xml
```

Expected: only placeholder/default values appear; no real password appears.

- [ ] **Step 2: Run the backend tests and package build**

Run:

```powershell
mvn.cmd clean test package
```

Expected: `BUILD SUCCESS`.

- [ ] **Step 3: Start the application with the user's MySQL environment variables**

Set values outside source control, for example:

```powershell
$env:DB_URL = 'jdbc:mysql://127.0.0.1:3306/rag_kb?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf8'
$env:DB_USERNAME = 'root'
$env:DB_PASSWORD = '<local-password>'
$env:DB_INIT_MODE = 'always'
```

Start the Spring Boot application and call:

```powershell
Invoke-RestMethod http://localhost:8081/api/db/ping
```

Expected: HTTP 200 with `success=true` and a `data.databaseTime` value when credentials and the `rag_kb` database are valid. With invalid credentials or an unavailable server, expected response is HTTP 503 with a clear sanitized `message`.

- [ ] **Step 4: Review final working-tree status**

Run:

```powershell
git status --short
```

Confirm only the intended MySQL integration files plus the user's pre-existing local changes are present.
