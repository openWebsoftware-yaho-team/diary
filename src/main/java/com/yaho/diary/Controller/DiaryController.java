package com.yaho.diary.Controller;

import com.yaho.diary.Entity.Schedule;
import com.yaho.diary.Entity.FixedSchedule;
import com.yaho.diary.Repository.ScheduleRepository;
import com.yaho.diary.Repository.FixedScheduleRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class DiaryController {

    private final ScheduleRepository scheduleRepository;
    private final FixedScheduleRepository fixedScheduleRepository; // 고정일정 레포지토리 추가

    public DiaryController(ScheduleRepository scheduleRepository, FixedScheduleRepository fixedScheduleRepository) {
        this.scheduleRepository = scheduleRepository;
        this.fixedScheduleRepository = fixedScheduleRepository;
    }

    @GetMapping("/diary")
    public ResponseEntity<Map<String, Object>> home() {
        LocalDate today = LocalDate.now();
        LocalDate mon = today.with(DayOfWeek.MONDAY);
        LocalDate sun = mon.plusDays(6);

        List<Schedule> allSchedules = scheduleRepository.findAll();

        // 이번 주 일반 일정 필터링
        List<Schedule> weekSchedules = allSchedules.stream()
                .filter(s -> !s.getDate().isBefore(mon) && !s.getDate().isAfter(sun))
                .collect(Collectors.toList());

        // 고정 일정 전체 목록 가져오기
        List<FixedSchedule> fixedList = fixedScheduleRepository.findAll();

        Map<String, Object> response = new HashMap<>();
        response.put("weekSchedules", weekSchedules);
        response.put("fixedList", fixedList); // 고정 일정 리스트 주입
        response.put("today", today.toString());
        response.put("mon", mon.toString()); // 리액트 연산용 월요일 기본 날짜

        return ResponseEntity.ok(response);
    }
}