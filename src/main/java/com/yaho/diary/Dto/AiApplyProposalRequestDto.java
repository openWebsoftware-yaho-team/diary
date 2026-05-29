package com.yaho.diary.Dto;

import java.util.ArrayList;
import java.util.List;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class AiApplyProposalRequestDto {
    private List<AiProposedScheduleItem> items = new ArrayList<>();
}
