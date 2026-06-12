package com.yaho.diary.Dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class AiProposedEditItem
{
    // 수정 대상(기존 등록 일정)을 찾기 위한 정보
    private String targetTitle;
    private String targetDate;
    private String targetStartTime;

    // 변경할 새 값 (null/빈값이면 기존 값 유지)
    private String title;
    private String date;
    private String startTime;
    private String endTime;
    private String category;
}
