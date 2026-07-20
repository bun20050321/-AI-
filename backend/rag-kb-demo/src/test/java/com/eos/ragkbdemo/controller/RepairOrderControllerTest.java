package com.eos.ragkbdemo.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.eos.ragkbdemo.service.RepairOrderService;
import com.eos.ragkbdemo.vo.RepairOrderVO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RepairOrderController.class)
class RepairOrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RepairOrderService repairOrderService;

    @Test
    void createRepairOrderReturnsCreatedOrder() throws Exception {
        RepairOrderVO order = new RepairOrderVO();
        order.setId(1L);
        order.setEquipmentName("空调");
        order.setFaultTitle("无法制冷");
        order.setFaultDesc("开机后无冷风");
        when(repairOrderService.create(any())).thenReturn(order);

        mockMvc.perform(post("/api/repair-orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"equipment_name\":\"空调\",\"fault_title\":\"无法制冷\",\"fault_desc\":\"开机后无冷风\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.equipment_name").value("空调"));
    }

    @Test
    void createRepairOrderRejectsMissingRequiredFields() throws Exception {
        mockMvc.perform(post("/api/repair-orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"equipment_name\":\" \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void listRepairOrdersReturnsPagedDataAndForwardsFilters() throws Exception {
        IPage<RepairOrderVO> page = new Page<>(2, 20, 21);
        RepairOrderVO order = new RepairOrderVO();
        order.setId(2L);
        page.setRecords(java.util.List.of(order));
        when(repairOrderService.page(any())).thenReturn(page);

        mockMvc.perform(get("/api/repair-orders")
                        .param("pageNum", "2")
                        .param("pageSize", "20")
                        .param("group_code", "G001")
                        .param("equipment_name", "空调")
                        .param("fault_title", "制冷"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.current").value(2))
                .andExpect(jsonPath("$.data.size").value(20))
                .andExpect(jsonPath("$.data.total").value(21));
    }

    @Test
    void getRepairOrderReturnsNotFoundResponseWhenMissing() throws Exception {
        when(repairOrderService.getById(eq(99L))).thenReturn(null);

        mockMvc.perform(get("/api/repair-orders/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.message").value("Repair order not found"));
    }
}
