package com.yaho.diary.Entity;

import java.time.LocalDate;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Getter @Setter
@NoArgsConstructor
public class FixedSchedule 
{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private SiteUser user;

    private String title;
    private Integer dayOfWeek;
    private String startTime;
    private String endTime;
    private String category;
    private LocalDate startDate;
    private LocalDate endDate;
}