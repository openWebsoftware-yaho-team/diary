package com.yaho.diary.Dto;

import java.util.ArrayList;
import java.util.List;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class AiChatResponseDto 
{
    private String reply;
    
    //proposals가 비어 있을 때 사용
    private List<AiProposedScheduleItem> items = new ArrayList<>();

    // 1~2개의 제안 안 (대화하며 갱신)
    private List<AiProposalOptionDto> proposals = new ArrayList<>();

    // 삭제만 제안할 때 (proposals 없이 removals만 올 수 있음)
    private List<AiProposedRemovalItem> removals = new ArrayList<>();

    // 기존 일정 수정만 제안할 때 (proposals 없이 edits만 올 수 있음)
    private List<AiProposedEditItem> edits = new ArrayList<>();
}
