package com.eos.ragkbdemo.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.eos.ragkbdemo.dto.RepairOrderCreateDTO;
import com.eos.ragkbdemo.dto.RepairOrderQueryDTO;
import com.eos.ragkbdemo.entity.RepairOrderEntity;
import com.eos.ragkbdemo.mapper.RepairOrderMapper;
import com.eos.ragkbdemo.vo.RepairOrderVO;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class RepairOrderServiceImpl implements RepairOrderService {

    private static final int DEFAULT_PAGE_NUM = 1;
    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 100;

    private final RepairOrderMapper repairOrderMapper;

    public RepairOrderServiceImpl(RepairOrderMapper repairOrderMapper) {
        this.repairOrderMapper = repairOrderMapper;
    }

    @Override
    public RepairOrderVO create(RepairOrderCreateDTO dto) {
        RepairOrderEntity entity = new RepairOrderEntity();
        entity.setGroupCode(dto.getGroupCode());
        entity.setEquipmentName(dto.getEquipmentName());
        entity.setFaultTitle(dto.getFaultTitle());
        entity.setFaultDesc(dto.getFaultDesc());
        repairOrderMapper.insert(entity);
        return toVO(entity);
    }

    @Override
    public IPage<RepairOrderVO> page(RepairOrderQueryDTO query) {
        long current = normalizePageNum(query.getPageNum());
        long size = normalizePageSize(query.getPageSize());
        Page<RepairOrderEntity> entityPage = new Page<>(current, size);

        LambdaQueryWrapper<RepairOrderEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StringUtils.hasText(query.getGroupCode()), RepairOrderEntity::getGroupCode, query.getGroupCode())
                .like(StringUtils.hasText(query.getEquipmentName()), RepairOrderEntity::getEquipmentName, query.getEquipmentName())
                .like(StringUtils.hasText(query.getFaultTitle()), RepairOrderEntity::getFaultTitle, query.getFaultTitle())
                .orderByDesc(RepairOrderEntity::getCreatedAt);

        IPage<RepairOrderEntity> selectedPage = repairOrderMapper.selectPage(entityPage, wrapper);
        Page<RepairOrderVO> result = new Page<>(selectedPage.getCurrent(), selectedPage.getSize(), selectedPage.getTotal());
        List<RepairOrderVO> records = selectedPage.getRecords().stream().map(this::toVO).toList();
        result.setRecords(records);
        return result;
    }

    @Override
    public RepairOrderVO getById(Long id) {
        RepairOrderEntity entity = repairOrderMapper.selectById(id);
        return entity == null ? null : toVO(entity);
    }

    private long normalizePageNum(Integer pageNum) {
        return pageNum == null || pageNum < 1 ? DEFAULT_PAGE_NUM : pageNum;
    }

    private long normalizePageSize(Integer pageSize) {
        if (pageSize == null || pageSize < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(pageSize, MAX_PAGE_SIZE);
    }

    private RepairOrderVO toVO(RepairOrderEntity entity) {
        RepairOrderVO vo = new RepairOrderVO();
        vo.setId(entity.getId());
        vo.setGroupCode(entity.getGroupCode());
        vo.setEquipmentName(entity.getEquipmentName());
        vo.setFaultTitle(entity.getFaultTitle());
        vo.setFaultDesc(entity.getFaultDesc());
        vo.setCreatedAt(entity.getCreatedAt());
        vo.setUpdatedAt(entity.getUpdatedAt());
        return vo;
    }
}
