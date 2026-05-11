package com.yaho.diary.Controller;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.yaho.diary.Entity.Schedule;
import com.yaho.diary.Repository.FixedScheduleRepository;
import com.yaho.diary.Repository.ScheduleRepository;
import com.yaho.diary.Service.OllamaScheduleService;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

@Controller
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

    // 1. 타임라인 페이지
    @GetMapping("/timeline")
    public String timelinePage(Model model) {
        model.addAttribute("scheduleList", scheduleRepository.findAll());
        model.addAttribute("fixedList", fixedScheduleRepository.findAll());
        return "timeline";
    }

    // 2. AI 일정 추가
    @PostMapping("/schedule/ai")
    public String aiSchedule(@RequestParam String message) throws Exception {
        ollamaScheduleService.extractSchedule(message);
        return "redirect:/timeline";
    }

    // 3. 일정 수정
    @PostMapping("/schedule/update")
    public String updateSchedule(
            @RequestParam Long id,
            @RequestParam String title,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime endTime
    ) {
        Optional<Schedule> opt = scheduleRepository.findById(id);
        if (opt.isPresent()) {
            Schedule s = opt.get();
            s.setTitle(title);
            s.setDate(date);
            s.setStartTime(startTime);
            s.setEndTime(endTime);
            scheduleRepository.save(s);
        }
        return "redirect:/timeline";
    }

    // 4. 일정 삭제
    @GetMapping("/schedule/delete")
    public String deleteSchedule(@RequestParam Long id) {
        scheduleRepository.deleteById(id);
        return "redirect:/timeline";
    }
}