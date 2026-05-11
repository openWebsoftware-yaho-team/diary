package com.yaho.diary.Entity;

import java.time.LocalDate;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class FixedSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    // 0=월, 1=화, 2=수, 3=목, 4=금, 5=토, 6=일
    private Integer dayOfWeek;

    private String startTime; // "HH:mm"

    private String endTime;   // "HH:mm"

    private String category;

    // null이면 무기한 반복
    private LocalDate endDate;
}