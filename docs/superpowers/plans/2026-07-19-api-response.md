# Unified ApiResponse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the backend response wrapper to `code/message/data` and use it for `GET /api/health` and `GET /api/db/ping`.

**Architecture:** Keep `ApiResponse<T>` as a Java record with three small static factories. Controllers build responses directly; no global advice, exception handler, or error-code hierarchy is added.

**Tech Stack:** Java 17, Spring Boot 3.4.6, MockMvc, JUnit 5.

## Global Constraints

- Success responses always use business code `0`.
- Database connection failures keep HTTP 503 and use business code `503`.
- Only `/api/health` and `/api/db/ping` change response shape.
- Preserve the existing database error-detail and password-redaction behavior.
- Do not automatically commit implementation files because the working tree contains earlier uncommitted user work.

---

### Task 1: Define the Response Contract in MVC Tests

**Files:**

- Modify: `backend/rag-kb-demo/src/test/java/com/eos/ragkbdemo/controller/ApplianceControllerTest.java`
- Modify: `backend/rag-kb-demo/src/test/java/com/eos/ragkbdemo/controller/DbControllerTest.java`

**Interfaces:**

- Consumes: `GET /api/health` and `GET /api/db/ping`.
- Produces: Failing assertions for the new `code/message/data` JSON contract.

- [ ] **Step 1: Change the health assertions**

```java
mockMvc.perform(get("/api/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.code").value(0))
        .andExpect(jsonPath("$.message").value("success"))
        .andExpect(jsonPath("$.data.status").value("ok"))
        .andExpect(jsonPath("$.data.service").value("rag-kb-demo"));
```

- [ ] **Step 2: Change the database success assertions**

```java
mockMvc.perform(get("/api/db/ping"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.code").value(0))
        .andExpect(jsonPath("$.message").value("Database connection is healthy"))
        .andExpect(jsonPath("$.data.databaseTime").value("2026-07-19T12:34:56"));
```

- [ ] **Step 3: Change the database error assertions**

```java
mockMvc.perform(get("/api/db/ping"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.code").value(503))
        .andExpect(jsonPath("$.message")
                .value("Database connection failed: Access denied for user 'root'; password=***"))
        .andExpect(jsonPath("$.data").doesNotExist());
```

- [ ] **Step 4: Run focused tests and verify RED**

Run from `backend/rag-kb-demo`:

```powershell
mvn.cmd clean "-Dtest=ApplianceControllerTest,DbControllerTest" test
```

Expected: failures because health has no wrapper and database responses still expose `success` instead of `code`.

### Task 2: Implement ApiResponse and Controller Changes

**Files:**

- Modify: `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/vo/ApiResponse.java`
- Modify: `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/controller/ApiController.java`
- Modify: `backend/rag-kb-demo/src/main/java/com/eos/ragkbdemo/controller/DbController.java`

**Interfaces:**

- Produces: `success(data)`, `success(message, data)`, and `error(code, message)`.

- [ ] **Step 1: Replace the response record**

```java
package com.eos.ragkbdemo.vo;

public record ApiResponse<T>(int code, String message, T data) {

    public static <T> ApiResponse<T> success(T data) {
        return success("success", data);
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(0, message, data);
    }

    public static <T> ApiResponse<T> error(int code, String message) {
        return new ApiResponse<>(code, message, null);
    }
}
```

- [ ] **Step 2: Wrap the health response**

```java
@GetMapping("/health")
public ApiResponse<Map<String, String>> health() {
    return ApiResponse.success(Map.of("status", "ok", "service", "rag-kb-demo"));
}
```

- [ ] **Step 3: Update database response factories**

Keep the existing success call with message-first arguments and replace failure with:

```java
return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
        .body(ApiResponse.error(
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                "Database connection failed: " + errorDetail(exception)));
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
mvn.cmd clean "-Dtest=ApplianceControllerTest,DbControllerTest" test
```

Expected: 7 focused tests pass.

### Task 3: Full Backend Verification

**Files:**

- Verify all modified backend files.

- [ ] **Step 1: Run the full suite and package build**

```powershell
mvn.cmd clean test package
```

Expected: 8 tests pass and Maven reports `BUILD SUCCESS`.

- [ ] **Step 2: Verify no old response field remains in the changed endpoints**

```powershell
rg -n "ApiResponse|success\(|error\(|/health|/ping" src/main/java src/test/java
```

Expected: both endpoints use the new factories; no call to `ApiResponse.failure` remains.

- [ ] **Step 3: Review working-tree scope**

```powershell
git status --short
git diff --check
```

Confirm the ApiResponse work is present alongside, without reverting, the user's earlier local changes.
