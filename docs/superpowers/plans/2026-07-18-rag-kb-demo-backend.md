# rag-kb-demo Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Java 17 Spring Boot Maven backend for the electrical-appliance introduction knowledge base, with a tested `GET /api/appliance` placeholder endpoint.

**Architecture:** The project is a single Spring Boot module at `backend/rag-kb-demo`. The web controller returns a static status payload directly, while package documentation reserves the layers needed for future "检索增强生成" work. Database and AI dependencies remain unconfigured, and datasource auto-configuration is excluded so the application can start without external infrastructure.

**Tech Stack:** Java 17, Spring Boot 3.4.6, Maven, Spring MVC, Jakarta Validation, MyBatis-Plus 3.5.11, MySQL Connector/J, Spring AI 1.0.0 OpenAI starter, Elasticsearch Java client, Lombok, JUnit 5, MockMvc.

## Global Constraints

- Create the backend only below `backend/rag-kb-demo`.
- Use Maven and compile with Java 17.
- Include Spring Web, Validation, MyBatis-Plus, MySQL Driver, Spring AI OpenAI Starter, Elasticsearch Java Client, and Lombok.
- Keep the initial scope to `GET /api/appliance`; do not add 检索增强生成、database, Elasticsearch, OpenAI, or CRUD behavior.
- Return HTTP 200 with exactly `{"status":"ok"}` for `GET /api/appliance`.
- Write and run the endpoint test before adding its production controller.
- The current workspace blocks writes to `.git`; do not attempt commits during execution.

---

### Task 1: Create The Maven Foundation

**Files:**

- Create: `backend/rag-kb-demo/pom.xml`
- Create: `backend/rag-kb-demo/.gitignore`
- Create: `backend/rag-kb-demo/src/main/resources/application.yml`

**Interfaces:**

- Consumes: Java 17 and Maven installed on the development machine.
- Produces: A Maven module that can compile Spring MVC tests and start without a database connection.

- [ ] **Step 1: Verify the build toolchain before creating sources**

Run:

```powershell
java -version
mvn -version
```

Expected: Java reports major version `17`, and Maven reports a Maven 3.x runtime using Java 17.

- [ ] **Step 2: Create the Maven project configuration**

Create `backend/rag-kb-demo/pom.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.6</version>
        <relativePath/>
    </parent>

    <groupId>com.eos</groupId>
    <artifactId>rag-kb-demo</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>rag-kb-demo</name>
    <description>Electrical appliance introduction knowledge-base backend</description>

    <properties>
        <java.version>17</java.version>
        <mybatis-plus.version>3.5.11</mybatis-plus.version>
        <spring-ai.version>1.0.0</spring-ai.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.ai</groupId>
                <artifactId>spring-ai-bom</artifactId>
                <version>${spring-ai.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
            <version>${mybatis-plus.version}</version>
        </dependency>
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-starter-model-openai</artifactId>
        </dependency>
        <dependency>
            <groupId>co.elastic.clients</groupId>
            <artifactId>elasticsearch-java</artifactId>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 3: Add local build exclusions and application identity**

Create `backend/rag-kb-demo/.gitignore`:

```gitignore
target/
.idea/
*.iml
.classpath
.project
.settings/
```

Create `backend/rag-kb-demo/src/main/resources/application.yml`:

```yaml
spring:
  application:
    name: rag-kb-demo
```

- [ ] **Step 4: Verify Maven can resolve the project definition**

Run from `backend/rag-kb-demo`:

```powershell
mvn -q help:effective-pom -Doutput=target/effective-pom.xml
```

Expected: exit code 0 and `target/effective-pom.xml` exists.

### Task 2: Define The Appliance Endpoint With A Failing MVC Test

**Files:**

- Create: `backend/rag-kb-demo/src/test/java/com/eos/ragkbdemo/controller/ApplianceControllerTest.java`

**Interfaces:**

- Consumes: Spring MVC test support from Task 1.
- Produces: The required HTTP contract for `GET /api/appliance` before its controller exists.

- [ ] **Step 1: Write the failing endpoint test**

Create `backend/rag-kb-demo/src/test/java/com/eos/ragkbdemo/controller/ApplianceControllerTest.java`:

```java
package com.eos.ragkbdemo.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ApplianceController.class)
class ApplianceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getApplianceReturnsOkStatus() throws Exception {
        mockMvc.perform(get("/api/appliance"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value("ok"));
    }
}
```

- [ ] **Step 2: Run the endpoint test to verify the expected red state**

Run from `backend/rag-kb-demo`:

```powershell
mvn test -Dtest=ApplianceControllerTest
```

Expected: compilation fails because `ApplianceController` does not exist. The failure confirms the test is exercising a missing production contract.

### Task 3: Add The Minimal Boot Application And Controller

**Files:**

- Create: `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/RagKbDemoApplication.java`
- Create: `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/controller/ApplianceController.java`
- Create: `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/service/package-info.java`
- Create: `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/mapper/package-info.java`
- Create: `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/entity/package-info.java`
- Create: `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/dto/package-info.java`
- Create: `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/vo/package-info.java`
- Create: `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/config/package-info.java`

**Interfaces:**

- Consumes: The failing `ApplianceControllerTest` from Task 2.
- Produces: A Spring Boot entry point and `GET /api/appliance` returning a JSON object with `status` equal to `ok`.

- [ ] **Step 1: Implement the smallest application entry point and controller**

Create `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/RagKbDemoApplication.java`:

```java
package com.eos.ragkbdemo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;

@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)
public class RagKbDemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(RagKbDemoApplication.class, args);
    }
}
```

Create `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/controller/ApplianceController.java`:

```java
package com.eos.ragkbdemo.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class ApplianceController {

    @GetMapping("/appliance")
    public Map<String, String> getAppliance() {
        return Map.of("status", "ok");
    }
}
```

- [ ] **Step 2: Add package documentation for the deferred layers**

Create `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/service/package-info.java`:

```java
/**
 * Service-layer contracts and implementations.
 */
package com.eos.ragkbdemo.service;
```

Create `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/mapper/package-info.java`:

```java
/**
 * Persistence mappers for the knowledge base.
 */
package com.eos.ragkbdemo.mapper;
```

Create `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/entity/package-info.java`:

```java
/**
 * Persistent knowledge-base entities.
 */
package com.eos.ragkbdemo.entity;
```

Create `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/dto/package-info.java`:

```java
/**
 * Data-transfer objects accepted by application boundaries.
 */
package com.eos.ragkbdemo.dto;
```

Create `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/vo/package-info.java`:

```java
/**
 * View objects returned by application endpoints.
 */
package com.eos.ragkbdemo.vo;
```

Create `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/config/package-info.java`:

```java
/**
 * Application configuration classes.
 */
package com.eos.ragkbdemo.config;
```

- [ ] **Step 3: Run the endpoint test to verify the green state**

Run from `backend/rag-kb-demo`:

```powershell
mvn test -Dtest=ApplianceControllerTest
```

Expected: one test passes. The response is HTTP 200, JSON, and has `status` set to `ok`.

### Task 4: Run The Full Build And Startup Check

**Files:**

- Modify: none

**Interfaces:**

- Consumes: The Spring Boot application and MVC test from Task 3.
- Produces: Fresh evidence that the Maven project builds and can initialize without external infrastructure.

- [ ] **Step 1: Run the complete test suite**

Run from `backend/rag-kb-demo`:

```powershell
mvn test
```

Expected: Maven exits 0 and `ApplianceControllerTest` passes.

- [ ] **Step 2: Package the application**

Run from `backend/rag-kb-demo`:

```powershell
mvn package -DskipTests
```

Expected: Maven exits 0 and creates `target/rag-kb-demo-0.0.1-SNAPSHOT.jar`.

- [ ] **Step 3: Confirm the application starts without a database**

Run from `backend/rag-kb-demo`:

```powershell
mvn spring-boot:run
```

Expected: startup logs include `Started RagKbDemoApplication`. Stop the process after observing the startup line.
