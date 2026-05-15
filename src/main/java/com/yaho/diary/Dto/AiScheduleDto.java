package com.yaho.diary.Dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

// AI가 자연어 메세지에서 일정 추출 시, 그 데이터를 담는 DTO

@Getter @Setter @NoArgsConstructor
public class AiScheduleDto 
{
    private String action; // ex. add, delete, update 등 그 종류
    private String title;
    private String date;
    private String startTime;
    private String endTime;
    private String category;
    private String targetTitle;
    private String targetDate;
    private Integer dayOfWeek; // add_fixed 전용.. // 0(월요일)~6(일요일)임. 
}