package com.yaho.diary.Controller;

import com.yaho.diary.Dto.AiScheduleDto;
import com.yaho.diary.Entity.FixedCompletion;
import com.yaho.diary.Entity.FixedSkip;
import com.yaho.diary.Entity.Schedule;
import com.yaho.diary.Entity.SiteUser;
import com.yaho.diary.Repository.FixedCompletionRepository;
import com.yaho.diary.Repository.FixedScheduleRepository;
import com.yaho.diary.Repository.ScheduleRepository;
import com.yaho.diary.Repository.FixedSkipRepository;
import com.yaho.diary.Repository.SiteUserRepository;
import com.yaho.diary.Service.GeminiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/schedule")
public class ScheduleController {

    private final GeminiService geminiService;
    private final ScheduleRepository scheduleRepository;
    private final FixedScheduleRepository fixedScheduleRepository;
    private final FixedCompletionRepository fixedCompletionRepository;
    private final FixedSkipRepository fixedSkipRepository;
    private final SiteUserRepository siteUserRepository;

    public ScheduleController(
            GeminiService geminiService,
            ScheduleRepository scheduleRepository,
            FixedScheduleRepository fixedScheduleRepository,
            FixedCompletionRepository fixedCompletionRepository,
            FixedSkipRepository fixedSkipRepository,
            SiteUserRepository siteUserRepository
    ) {
        this.geminiService = geminiService;
        this.scheduleRepository = scheduleRepository;
        this.fixedScheduleRepository = fixedScheduleRepository;
        this.fixedCompletionRepository = fixedCompletionRepository;
        this.fixedSkipRepository = fixedSkipRepository;
        this.siteUserRepository = siteUserRepository;
    }

    @GetMapping("/timeline")
    public ResponseEntity<Map<String, Object>> getTimelineData(Principal principal)
    {
        SiteUser user = siteUserRepository.findByUsername(principal.getName());
        LocalDate today = LocalDate.now();
        LocalDate monday = today.with(java.time.DayOfWeek.MONDAY);
        LocalDate sunday = monday.plusDays(6);

        List<String> completedFixedKeys = fixedCompletionRepository.findAll().stream()
            .map(fc -> fc.getFixedId() + "-" + fc.getDate())
            .collect(Collectors.toList());

        List<String> skippedFixedKeys = fixedSkipRepository.findAll().stream()
            .map(fs -> fs.getFixedId() + "-" + fs.getDate())
            .collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("scheduleList", scheduleRepository.findByUserAndDateBetween(user, monday, sunday));
        data.put("fixedList", fixedScheduleRepository.findByUser(user));
        data.put("completedFixedKeys", completedFixedKeys);
        data.put("skippedFixedKeys", skippedFixedKeys);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/calendar")
    public ResponseEntity<Map<String, Object>> getCalendarData(Principal principal)
    {
        SiteUser user = siteUserRepository.findByUsername(principal.getName());

        List<String> completedFixedKeys = fixedCompletionRepository.findAll().stream()
            .map(fc -> fc.getFixedId() + "-" + fc.getDate())
            .collect(Collectors.toList());

        List<String> skippedFixedKeys = fixedSkipRepository.findAll().stream()
            .map(fs -> fs.getFixedId() + "-" + fs.getDate())
            .collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("scheduleList", scheduleRepository.findByUser(user));
        data.put("fixedList", fixedScheduleRepository.findByUser(user));
        data.put("completedFixedKeys", completedFixedKeys);
        data.put("skippedFixedKeys", skippedFixedKeys);
        return ResponseEntity.ok(data);
    }

    @PostMapping("/fixed-skip")
    public ResponseEntity<Map<String, String>> toggleFixedSkip(@RequestBody Map<String, Object> payload)
    {
        Map<String, String> response = new HashMap<>();
        Long fixedId = Long.valueOf(payload.get("fixedId").toString());
        String date = payload.get("date").toString();

        Optional<FixedSkip> found = fixedSkipRepository.findByFixedIdAndDate(fixedId, date);
        if (found.isPresent())
        {
            fixedSkipRepository.delete(found.get());
            response.put("message", "루틴 제외 처리가 취소되었습니다.");
        }
        else
        {
            FixedSkip fs = new FixedSkip();
            fs.setFixedId(fixedId);
            fs.setDate(date);
            fixedSkipRepository.save(fs);
            response.put("message", "오늘 루틴 일정에서 성공적으로 제외되었습니다.");
        }
        return ResponseEntity.ok(response);
    }

    @PutMapping("/update")
    public ResponseEntity<Map<String, String>> updateSchedule(@RequestBody Map<String, Object> payload)
    {
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
        Boolean isCompleted = null;
        if (payload.get("isCompleted") != null) {
            isCompleted = (Boolean) payload.get("isCompleted");
        }
        Optional<Schedule> found = scheduleRepository.findById(id);
        if (found.isPresent())
        {
            Schedule s = found.get();
            s.setTitle(title);
            s.setCategory(category);
            s.setDate(date);
            s.setStartTime(startTime);
            s.setEndTime(endTime);
            if (isCompleted != null) s.setIsCompleted(isCompleted);
            scheduleRepository.save(s);
            response.put("message", "일정이 정상적으로 수정되었습니다.");
            return ResponseEntity.ok(response);
        }
        response.put("message", "해당 일정을 찾을 수 없습니다.");
        return ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Map<String, String>> deleteSchedule(@PathVariable Long id)
    {
        scheduleRepository.deleteById(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "일정이 정상적으로 삭제되었습니다.");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/complete/{id}")
    public ResponseEntity<Map<String, String>> toggleComplete(@PathVariable Long id)
    {
        Map<String, String> response = new HashMap<>();
        Optional<Schedule> found = scheduleRepository.findById(id);
        if (found.isPresent())
        {
            Schedule s = found.get();
            s.setIsCompleted(!s.getIsCompleted());
            scheduleRepository.save(s);
            response.put("message", "완료 상태가 변경되었습니다.");
            return ResponseEntity.ok(response);
        }
        response.put("message", "일정을 찾을 수 없습니다.");
        return ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/fixed-complete")
    public ResponseEntity<Map<String, String>> toggleFixedComplete(@RequestBody Map<String, Object> payload)
    {
        Map<String, String> response = new HashMap<>();
        Long fixedId = Long.valueOf(payload.get("fixedId").toString());
        String date = payload.get("date").toString();
        Optional<FixedCompletion> found = fixedCompletionRepository.findByFixedIdAndDate(fixedId, date);

        if (found.isPresent())
        {
            fixedCompletionRepository.delete(found.get());
            response.put("message", "체크 해제");
        }
        else
        {
            FixedCompletion fc = new FixedCompletion();
            fc.setFixedId(fixedId);
            fc.setDate(date);
            fixedCompletionRepository.save(fc);
            response.put("message", "체크 완료");
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/add")
    public ResponseEntity<Map<String, String>> addSchedule(@RequestBody Map<String, Object> payload, Principal principal)
    {
        Map<String, String> response = new HashMap<>();
        String title = payload.get("title").toString();
        LocalDate date = LocalDate.parse(payload.get("date").toString());
        LocalTime startTime = LocalTime.parse(payload.get("startTime").toString());
        String category = payload.getOrDefault("category", "기타").toString();
        LocalTime endTime = null;

        if (payload.get("endTime") != null && !payload.get("endTime").toString().isBlank())
        {
            endTime = LocalTime.parse(payload.get("endTime").toString());
        }

        SiteUser user = siteUserRepository.findByUsername(principal.getName());

        Schedule s = new Schedule();
        s.setTitle(title);
        s.setDate(date);
        s.setStartTime(startTime);
        s.setEndTime(endTime);
        s.setCategory(category);
        s.setUser(user);
        scheduleRepository.save(s);

        response.put("message", "일정이 정상적으로 추가되었습니다.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/ai")
    public ResponseEntity<Map<String, String>> processAiCommand(@RequestBody Map<String, String> payload) {
        Map<String, String> response = new HashMap<>();
        try {
            String message = payload.get("message");
            geminiService.extractSchedule(message);
            response.put("message", "AI가 성공적으로 일정을 처리했습니다.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            response.put("message", "AI 처리 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}