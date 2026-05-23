package com.yaho.diary.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter @Setter
public class SiteUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String username;

    private String password;
    
    private String email; // 이메일 칸 복원

    private String theme = "light"; // 테마 설정 (기본값: light)

    private String defaultCategory = "기타"; // AI/일정 등록 시 사용할 기본 카테고리
}