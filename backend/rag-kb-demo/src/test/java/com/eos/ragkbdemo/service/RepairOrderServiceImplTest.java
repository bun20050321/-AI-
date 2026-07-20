package com.eos.ragkbdemo.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.eos.ragkbdemo.dto.RepairOrderCreateDTO;
import com.eos.ragkbdemo.dto.RepairOrderQueryDTO;
import com.eos.ragkbdemo.entity.RepairOrderEntity;
import com.eos.ragkbdemo.mapper.RepairOrderMapper;
import com.eos.ragkbdemo.vo.RepairOrderVO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RepairOrderServiceImplTest {

    @Mock
    private RepairOrderMapper repairOrderMapper;

    @InjectMocks
    private RepairOrderServiceImpl repairOrderService;

    @Test
    void createMapsDtoToEntityAndReturnsVo() {
        RepairOrderCreateDTO dto = new RepairOrderCreateDTO();
        dto.setGroupCode("G001");
        dto.setEquipmentName("空调");
        dto.setFaultTitle("无法制冷");
        dto.setFaultDesc("开机后无冷风");
        when(repairOrderMapper.insert(any(RepairOrderEntity.class))).thenAnswer(invocation -> {
            RepairOrderEntity entity = invocation.getArgument(0);
            entity.setId(1L);
            return 1;
        });

        RepairOrderVO result = repairOrderService.create(dto);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getGroupCode()).isEqualTo("G001");
        assertThat(result.getEquipmentName()).isEqualTo("空调");
        verify(repairOrderMapper).insert(any(RepairOrderEntity.class));
    }

    @Test
    void pageUsesRequestedPageAndReturnsMappedRecords() {
        RepairOrderQueryDTO query = new RepairOrderQueryDTO();
        query.setPageNum(2);
        query.setPageSize(20);
        query.setGroupCode("G001");
        query.setEquipmentName("空调");
        query.setFaultTitle("制冷");
        Page<RepairOrderEntity> entityPage = new Page<>(2, 20, 1);
        RepairOrderEntity entity = new RepairOrderEntity();
        entity.setId(2L);
        entity.setGroupCode("G001");
        entity.setEquipmentName("空调");
        entity.setFaultTitle("无法制冷");
        entityPage.setRecords(List.of(entity));
        when(repairOrderMapper.selectPage(any(Page.class), any())).thenReturn(entityPage);

        IPage<RepairOrderVO> result = repairOrderService.page(query);

        assertThat(result.getCurrent()).isEqualTo(2);
        assertThat(result.getSize()).isEqualTo(20);
        assertThat(result.getTotal()).isEqualTo(1);
        assertThat(result.getRecords()).singleElement().extracting(RepairOrderVO::getFaultTitle)
                .isEqualTo("无法制冷");
        verify(repairOrderMapper).selectPage(any(Page.class), any());
    }
}
