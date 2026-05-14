package com.yaho.diary.Entity;

import java.time.LocalDate;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Getter @Setter
@NoArgsConstructor
public class FixedSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private Integer dayOfWeek; // 0=월 ~ 6=일

    private String startTime;

    private String endTime;

    private String category;

    private LocalDate endDate; // null이면 무기한
}