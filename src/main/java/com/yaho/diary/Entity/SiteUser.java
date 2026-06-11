package com.yaho.diary.Entity;

import java.util.ArrayList;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.ArrayList;
import java.util.List;


@Entity
@Getter @Setter
public class SiteUser 
{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Schedule> schedules = new ArrayList<>();

    @Column(unique = true)
    private String username;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FixedSchedule> fixedSchedules = new ArrayList<>();

    private String password;
    
    private String email; // 이메일 칸 복원

    private String theme = "light"; // 테마 설정 (디폴트값: 라이트)

    private String defaultCategory = "기타"; // AI/일정 등록 시 사용할 기본 카테고리
}