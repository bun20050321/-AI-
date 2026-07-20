package com.eos.ragkbdemo.controller;

import com.eos.ragkbdemo.vo.ApiResponse;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final AtomicLong repairId = new AtomicLong(1);
    private final List<Map<String, Object>> repairs = new CopyOnWriteArrayList<>();

    @GetMapping("/health")
    public ApiResponse<Map<String, String>> health() {
        return ApiResponse.success(Map.of("status", "ok", "service", "rag-kb-demo"));
    }

    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<String> chat(@RequestBody(required = false) Map<String, Object> request) {
        String message = request == null ? "" : String.valueOf(request.getOrDefault("message", ""));
        String content = message.isBlank()
                ? "请告诉我您想了解的家电问题。"
                : "已收到您的问题：" + message + "。当前演示后端已连接，可继续咨询使用和维修问题。";
        String event = "data: {\"content\":\"" + escapeJson(content) + "\"}\n\n";
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .body(event);
    }

    @PostMapping("/repair")
    public Map<String, Object> createRepair(@RequestBody Map<String, Object> request) {
        Map<String, Object> repair = new LinkedHashMap<>(request);
        repair.put("id", repairId.getAndIncrement());
        repair.put("status", "pending");
        String now = Instant.now().toString();
        repair.put("createdAt", now);
        repair.put("updatedAt", now);
        repairs.add(repair);
        return repair;
    }

    @GetMapping("/repair/my")
    public List<Map<String, Object>> listRepairs() {
        return new ArrayList<>(repairs);
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
