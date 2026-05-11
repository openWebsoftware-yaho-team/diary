package com.yaho.diary.Dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class AiScheduleDto {

    private String title;
    private String date;
    private String startTime;
    private String endTime;
    private String category;
    private String action;
    private String targetTitle;
    private String targetDate;
    private Integer dayOfWeek; // add_fixed 시 사용 (0=월~6=일)
}