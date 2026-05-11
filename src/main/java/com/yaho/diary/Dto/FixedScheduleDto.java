package com.yaho.diary.Dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class FixedScheduleDto {

    private String title;
    private Integer dayOfWeek; // 0=월~6=일
    private String startTime;  // "HH:mm"
    private String endTime;    // "HH:mm"
    private String category;
    private String endDate;    // "YYYY-MM-DD" or null(무기한)
}