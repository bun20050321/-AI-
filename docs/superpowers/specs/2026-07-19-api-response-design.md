# Unified ApiResponse Design

## Goal

Standardize the response body for `GET /api/health` and `GET /api/db/ping` with a small generic `ApiResponse<T>`.

## Contract

`ApiResponse<T>` contains exactly these fields in this order:

- `code`: integer business code; success is always `0`.
- `message`: human-readable result text.
- `data`: response payload, or `null` for errors.

The record exposes these factories:

```java
ApiResponse.success(data)
ApiResponse.success(message, data)
ApiResponse.error(code, message)
```

`success(data)` uses `code=0` and `message="success"`. The overload preserves a useful endpoint-specific success message while still enforcing `code=0`. `error(code, message)` sets `data=null`.

## Endpoint Changes

`GET /api/health` returns HTTP 200 and:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "status": "ok",
    "service": "rag-kb-demo"
  }
}
```

`GET /api/db/ping` keeps its HTTP behavior. A successful query returns `code=0`, its existing success message, and `databaseTime` in `data`. A failed query returns HTTP 503, `code=503`, the existing sanitized failure message, and `data=null`.

## Testing

MVC tests will first be changed to assert `code`, `message`, and nested `data`. They must fail against the old response shape before production code changes. The focused controller tests and full backend Maven suite must pass after implementation.

## Boundaries

Other existing endpoints keep their current response bodies. No global exception handler, error-code enum, or additional abstraction is introduced.
