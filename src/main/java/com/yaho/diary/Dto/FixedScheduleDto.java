package com.yaho.diary.Dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter @Setter @NoArgsConstructor
public class FixedScheduleDto 
{

    private String title;
    private Integer dayOfWeek;   // 0(월요일)~6(일요일)
    private String startTime;    // HH:mm
    private String endTime;      // HH:mm
    private String category;
    private String endDate;      // null이면 무기한으로 처리
}