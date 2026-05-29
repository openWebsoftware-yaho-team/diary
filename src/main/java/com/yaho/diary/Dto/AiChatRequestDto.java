package com.yaho.diary.Dto;

import java.util.ArrayList;
import java.util.List;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class AiChatRequestDto {
    private String message;
    private List<AiChatMessageDto> history = new ArrayList<>();
    /** 직전 AI 제안 초안 (대화하며 수정할 때 전달) */
    private List<AiProposalOptionDto> currentProposals = new ArrayList<>();
}
