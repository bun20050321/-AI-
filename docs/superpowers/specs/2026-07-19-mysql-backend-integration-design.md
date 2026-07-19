# MySQL Backend Integration Design

## Goal

Connect the Spring Boot backend to the local MySQL 8.0 service, add a small MySQL initialization script, and expose a database connectivity check at `GET /api/db/ping`.

## Scope

- Use MySQL 8 syntax for a new backend-owned initialization script.
- Read database URL, username, and password from environment variables.
- Enable Spring Boot datasource auto-configuration and add basic MyBatis-Plus settings.
- Query the current database time through `JdbcTemplate`.
- Return one response shape for success and failure.
- Keep existing in-memory repair/chat behavior unchanged.
- Resolve the existing CORS wildcard/credentials conflict so the web layer remains testable.

The existing root `db/` scripts target PostgreSQL and remain unchanged. The new MySQL script is independent and lives under the backend resources directory.

## Design

`backend/rag-kb-demo/src/main/resources/application.yml` will configure a MySQL datasource with these environment variables:

- `DB_URL`, defaulting to a local `rag_kb` database URL.
- `DB_USERNAME`, defaulting to `root`.
- `DB_PASSWORD`, defaulting to an empty value and never containing a real password in source control.

`DB_INIT_MODE` controls whether Spring runs the new initialization script; it defaults to `never` so an unavailable database does not prevent the application from starting and reporting a useful ping failure. Setting it to `always` runs `classpath:db/init.sql`.

The new SQL creates `database_connection_checks` with an auto-incrementing identifier, status, and timestamp. The ping endpoint does not write a row; it only executes `SELECT CURRENT_TIMESTAMP`, keeping the check safe and side-effect free.

`ApiResponse<T>` will use this shape:

```json
{
  "success": true,
  "data": { "databaseTime": "2026-07-19T12:00:00Z" },
  "message": "Database connection is healthy"
}
```

Failures return HTTP 503 with `success: false`, `data: null`, and a message containing the operation and sanitized database exception text. Passwords and full JDBC credentials must not be included.

## Testing

- MVC tests verify the successful database time response and the 503 failure response.
- Configuration checks verify environment placeholders, MyBatis-Plus settings, and the MySQL initialization script.
- The full backend Maven test suite must pass after the CORS configuration is corrected.

## Out Of Scope

- Moving repair orders from memory into MySQL.
- Implementing MyBatis-Plus entities, mappers, or business CRUD.
- Automatically creating databases or users.
- Adding Flyway/Liquibase or replacing the existing PostgreSQL documentation.
