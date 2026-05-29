package com.yaho.diary.Dto;

import java.util.ArrayList;
import java.util.List;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class AiChatResponseDto {
    private String reply;
    /** 하위 호환: proposals가 비어 있을 때 사용 */
    private List<AiProposedScheduleItem> items = new ArrayList<>();
    /** 1~2개의 제안 안 (대화하며 갱신) */
    private List<AiProposalOptionDto> proposals = new ArrayList<>();
}
