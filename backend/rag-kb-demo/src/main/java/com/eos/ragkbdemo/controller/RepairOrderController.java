package com.eos.ragkbdemo.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.eos.ragkbdemo.dto.RepairOrderCreateDTO;
import com.eos.ragkbdemo.dto.RepairOrderQueryDTO;
import com.eos.ragkbdemo.service.RepairOrderService;
import com.eos.ragkbdemo.vo.ApiResponse;
import com.eos.ragkbdemo.vo.RepairOrderVO;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/repair-orders")
public class RepairOrderController {

    private final RepairOrderService repairOrderService;

    public RepairOrderController(RepairOrderService repairOrderService) {
        this.repairOrderService = repairOrderService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RepairOrderVO>> create(@Valid @RequestBody RepairOrderCreateDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(repairOrderService.create(dto)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<IPage<RepairOrderVO>>> page(
            @RequestParam(name = "group_code", required = false) String groupCode,
            @RequestParam(name = "equipment_name", required = false) String equipmentName,
            @RequestParam(name = "fault_title", required = false) String faultTitle,
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize) {
        RepairOrderQueryDTO query = new RepairOrderQueryDTO();
        query.setGroupCode(groupCode);
        query.setEquipmentName(equipmentName);
        query.setFaultTitle(faultTitle);
        query.setPageNum(pageNum);
        query.setPageSize(pageSize);
        return ResponseEntity.ok(ApiResponse.success(repairOrderService.page(query)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RepairOrderVO>> getById(@PathVariable Long id) {
        RepairOrderVO result = repairOrderService.getById(id);
        if (result == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(HttpStatus.NOT_FOUND.value(), "Repair order not found"));
        }
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .findFirst()
                .orElse("Invalid request");
        return ResponseEntity.badRequest().body(ApiResponse.error(HttpStatus.BAD_REQUEST.value(), message));
    }
}
