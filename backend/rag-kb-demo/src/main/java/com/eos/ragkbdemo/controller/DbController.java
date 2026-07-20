package com.eos.ragkbdemo.controller;

import com.eos.ragkbdemo.vo.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.sql.Timestamp;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/db")
public class DbController {

    private static final String CURRENT_TIMESTAMP_SQL = "SELECT CURRENT_TIMESTAMP";
    private static final Pattern PASSWORD_PATTERN = Pattern.compile(
            "(?i)(password\\s*[=:]\\s*)[^\\s;]+");

    private final JdbcTemplate jdbcTemplate;

    public DbController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/ping")
    public ResponseEntity<ApiResponse<Map<String, String>>> ping() {
        try {
            Timestamp databaseTime = jdbcTemplate.queryForObject(CURRENT_TIMESTAMP_SQL, Timestamp.class);
            if (databaseTime == null) {
                throw new IllegalStateException("Database returned no current time");
            }

            return ResponseEntity.ok(ApiResponse.success(
                    "Database connection is healthy",
                    Map.of("databaseTime", databaseTime.toLocalDateTime().toString())));
        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.error(
                            HttpStatus.SERVICE_UNAVAILABLE.value(),
                            "Database connection failed: " + errorDetail(exception)));
        }
    }

    private String errorDetail(RuntimeException exception) {
        Throwable rootCause = exception;
        while (rootCause.getCause() != null && rootCause.getCause() != rootCause) {
            rootCause = rootCause.getCause();
        }

        String detail = rootCause.getMessage();
        if (detail == null || detail.isBlank()) {
            detail = rootCause.getClass().getSimpleName();
        }
        return PASSWORD_PATTERN.matcher(detail).replaceAll("$1***");
    }
}
