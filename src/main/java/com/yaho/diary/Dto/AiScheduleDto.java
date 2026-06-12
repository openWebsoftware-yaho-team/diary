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
    private String targetStartTime;
    private Integer dayOfWeek; // add_fixed / update_fixed의 새 요일 (0=월~6=일)
    private Integer targetDayOfWeek; // delete_fixed / update_fixed 대상 식별용 요일 (0=월~6=일)
}