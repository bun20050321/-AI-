package com.eos.ragkbdemo.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.eos.ragkbdemo.dto.RepairOrderCreateDTO;
import com.eos.ragkbdemo.dto.RepairOrderQueryDTO;
import com.eos.ragkbdemo.vo.RepairOrderVO;

public interface RepairOrderService {

    RepairOrderVO create(RepairOrderCreateDTO dto);

    IPage<RepairOrderVO> page(RepairOrderQueryDTO query);

    RepairOrderVO getById(Long id);
}
