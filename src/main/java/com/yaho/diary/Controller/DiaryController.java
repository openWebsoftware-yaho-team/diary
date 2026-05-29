package com.yaho.diary.Controller;

import com.yaho.diary.Entity.FixedCompletion;
import com.yaho.diary.Entity.Schedule;
import com.yaho.diary.Entity.FixedSchedule;
import com.yaho.diary.Repository.FixedCompletionRepository;
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
    private final FixedScheduleRepository fixedScheduleRepository;
    private final FixedCompletionRepository fixedCompletionRepository;

    public DiaryController(
            ScheduleRepository scheduleRepository,
            FixedScheduleRepository fixedScheduleRepository,
            FixedCompletionRepository fixedCompletionRepository
    ) {
        this.scheduleRepository = scheduleRepository;
        this.fixedScheduleRepository = fixedScheduleRepository;
        this.fixedCompletionRepository = fixedCompletionRepository;
    }

    @GetMapping("/diary")
    public ResponseEntity<Map<String, Object>> home() {
        LocalDate today = LocalDate.now();
        LocalDate mon = today.with(DayOfWeek.MONDAY);
        LocalDate sun = mon.plusDays(6);

        List<Schedule> weekSchedules = scheduleRepository.findAll().stream()
                .filter(s -> !s.getDate().isBefore(mon) && !s.getDate().isAfter(sun))
                .collect(Collectors.toList());

        List<FixedSchedule> fixedList = fixedScheduleRepository.findAll();

        // 이번주 고정 일정 체크 목록
        List<FixedCompletion> fixedCompletions = fixedCompletionRepository.findAll().stream()
                .filter(fc -> {
                    LocalDate d = LocalDate.parse(fc.getDate());
                    return !d.isBefore(mon) && !d.isAfter(sun);
                })
                .collect(Collectors.toList());

        // fixedId-date 형태로 set 만들기
        java.util.Set<String> completedFixedKeys = fixedCompletions.stream()
                .map(fc -> fc.getFixedId() + "-" + fc.getDate())
                .collect(Collectors.toSet());

        Map<String, Object> response = new HashMap<>();
        response.put("weekSchedules", weekSchedules);
        response.put("fixedList", fixedList);
        response.put("completedFixedKeys", completedFixedKeys);
        response.put("today", today.toString());
        response.put("mon", mon.toString());

        return ResponseEntity.ok(response);
    }
}