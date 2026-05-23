package com.yaho.diary.Controller;

import com.yaho.diary.Dto.AiScheduleDto;
import com.yaho.diary.Entity.Schedule;
import com.yaho.diary.Repository.FixedScheduleRepository;
import com.yaho.diary.Repository.ScheduleRepository;
import com.yaho.diary.Service.OllamaScheduleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import java.time.DayOfWeek;
import java.util.List;

@RestController
@RequestMapping("/api/schedule")
public class ScheduleController {

    private final OllamaScheduleService ollamaScheduleService;
    private final ScheduleRepository scheduleRepository;
    private final FixedScheduleRepository fixedScheduleRepository;

    public ScheduleController(
            OllamaScheduleService ollamaScheduleService,
            ScheduleRepository scheduleRepository,
            FixedScheduleRepository fixedScheduleRepository
    ) {
        this.ollamaScheduleService = ollamaScheduleService;
        this.scheduleRepository = scheduleRepository;
        this.fixedScheduleRepository = fixedScheduleRepository;
    }

    @GetMapping("/timeline")
    public ResponseEntity<Map<String, Object>> getTimelineData() {
        // 이번주 월~일 범위 계산
        LocalDate today = LocalDate.now();
        LocalDate monday = today.with(java.time.DayOfWeek.MONDAY);
        LocalDate sunday = monday.plusDays(6);

        Map<String, Object> data = new HashMap<>();
        data.put("scheduleList", scheduleRepository.findByDateBetween(monday, sunday));
        data.put("fixedList", fixedScheduleRepository.findAll());
        return ResponseEntity.ok(data);
    }

    // 캘린더 데이터 요청 시 고정 일정 데이터도 묶어서 반환
    @GetMapping("/calendar")
    public ResponseEntity<Map<String, Object>> getCalendarData() {
        Map<String, Object> data = new HashMap<>();
        data.put("scheduleList", scheduleRepository.findAll());
        data.put("fixedList", fixedScheduleRepository.findAll()); // 고정 일정 추가
        return ResponseEntity.ok(data);
    }

    @PostMapping("/ai")
    public ResponseEntity<AiScheduleDto> aiSchedule(@RequestBody Map<String, String> payload) throws Exception {
        String message = payload.get("message");
        AiScheduleDto result = ollamaScheduleService.extractSchedule(message);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/update")
    public ResponseEntity<Map<String, String>> updateSchedule(@RequestBody Map<String, Object> payload) {
        Map<String, String> response = new HashMap<>();
        
        Long id = Long.valueOf(payload.get("id").toString());
        String title = payload.get("title").toString();
        String category = payload.getOrDefault("category", "기타").toString(); 
        LocalDate date = LocalDate.parse(payload.get("date").toString());
        LocalTime startTime = LocalTime.parse(payload.get("startTime").toString());
        
        LocalTime endTime = null;
        if (payload.get("endTime") != null && !payload.get("endTime").toString().isBlank()) {
            endTime = LocalTime.parse(payload.get("endTime").toString());
        }

        Optional<Schedule> found = scheduleRepository.findById(id);
        if (found.isPresent()) {
            Schedule s = found.get();
            s.setTitle(title);
            s.setCategory(category);
            s.setDate(date);
            s.setStartTime(startTime);
            s.setEndTime(endTime);
            scheduleRepository.save(s);
            
            response.put("message", "일정이 정상적으로 수정되었습니다.");
            return ResponseEntity.ok(response);
        }

        response.put("message", "해당 일정을 찾을 수 없습니다.");
        return ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Map<String, String>> deleteSchedule(@PathVariable Long id) {
        scheduleRepository.deleteById(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "일정이 정상적으로 삭제되었습니다.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/add")
    public ResponseEntity<Map<String, String>> addSchedule(@RequestBody Map<String, Object> payload) {
        Map<String, String> response = new HashMap<>();

        String title = payload.get("title").toString();
        LocalDate date = LocalDate.parse(payload.get("date").toString());
        LocalTime startTime = LocalTime.parse(payload.get("startTime").toString());
        String category = payload.getOrDefault("category", "기타").toString(); // 이 줄 추가

        LocalTime endTime = null;
        if (payload.get("endTime") != null && !payload.get("endTime").toString().isBlank()) {
            endTime = LocalTime.parse(payload.get("endTime").toString());
        }

        Schedule s = new Schedule();
        s.setTitle(title);
        s.setDate(date);
        s.setStartTime(startTime);
        s.setEndTime(endTime);
        s.setCategory(category); // 이 줄 추가

        scheduleRepository.save(s);
        response.put("message", "일정이 정상적으로 추가되었습니다.");
        return ResponseEntity.ok(response);
    }
}
