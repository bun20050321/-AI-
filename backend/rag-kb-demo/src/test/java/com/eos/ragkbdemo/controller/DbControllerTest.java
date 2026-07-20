package com.eos.ragkbdemo.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
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

    @MockitoBean
    private JdbcTemplate jdbcTemplate;

    @Test
    void pingReturnsCurrentDatabaseTime() throws Exception {
        when(jdbcTemplate.queryForObject(eq("SELECT CURRENT_TIMESTAMP"), eq(Timestamp.class)))
                .thenReturn(Timestamp.valueOf("2026-07-19 12:34:56"));

        mockMvc.perform(get("/api/db/ping"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.message").value("Database connection is healthy"))
                .andExpect(jsonPath("$.data.databaseTime").value("2026-07-19T12:34:56"));
    }

    @Test
    void pingReturnsClearServiceUnavailableResponseWhenDatabaseFails() throws Exception {
        when(jdbcTemplate.queryForObject(eq("SELECT CURRENT_TIMESTAMP"), eq(Timestamp.class)))
                .thenThrow(new IllegalStateException(
                        "Failed to obtain JDBC Connection",
                        new IllegalArgumentException("Access denied for user 'root'; password=secret")));

        mockMvc.perform(get("/api/db/ping"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value(503))
                .andExpect(jsonPath("$.message")
                        .value("Database connection failed: Access denied for user 'root'; password=***"))
                .andExpect(jsonPath("$.data").doesNotExist());
    }
}
