package com.yaho.diary.Dto;

import java.util.ArrayList;
import java.util.List;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class AiApplyResultDto
{
    private int addedCount;
    private int removedCount;
    private int updatedCount;
    private boolean success;
    private String message;
    private List<AiProposedScheduleItem> conflicts = new ArrayList<>();
}
