package com.eos.ragkbdemo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public class RepairOrderCreateDTO {

    @JsonProperty("group_code")
    private String groupCode;

    @JsonProperty("equipment_name")
    @NotBlank(message = "equipment_name must not be blank")
    private String equipmentName;

    @JsonProperty("fault_title")
    @NotBlank(message = "fault_title must not be blank")
    private String faultTitle;

    @JsonProperty("fault_desc")
    @NotBlank(message = "fault_desc must not be blank")
    private String faultDesc;

    public String getGroupCode() {
        return groupCode;
    }

    public void setGroupCode(String groupCode) {
        this.groupCode = groupCode;
    }

    public String getEquipmentName() {
        return equipmentName;
    }

    public void setEquipmentName(String equipmentName) {
        this.equipmentName = equipmentName;
    }

    public String getFaultTitle() {
        return faultTitle;
    }

    public void setFaultTitle(String faultTitle) {
        this.faultTitle = faultTitle;
    }

    public String getFaultDesc() {
        return faultDesc;
    }

    public void setFaultDesc(String faultDesc) {
        this.faultDesc = faultDesc;
    }
}
