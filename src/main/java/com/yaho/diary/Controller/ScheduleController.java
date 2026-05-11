package com.yaho.diary.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.yaho.diary.Repository.ScheduleRepository;
import com.yaho.diary.Service.OllamaScheduleService;

@Controller
public class ScheduleController {

    private final OllamaScheduleService ollamaScheduleService;
    private final ScheduleRepository scheduleRepository;

    public ScheduleController(
            OllamaScheduleService ollamaScheduleService,
            ScheduleRepository scheduleRepository
    ) {
        this.ollamaScheduleService = ollamaScheduleService;
        this.scheduleRepository = scheduleRepository;
    }

    // 1. 타임라인(주간 시간표) 페이지
    @GetMapping("/timeline")
    public String timelinePage(Model model) {
        // 타임테이블을 그리기 위해 전체 일정 데이터를 넘겨줌
        model.addAttribute("scheduleList", scheduleRepository.findAll());
        return "timeline";
    }

    // 2. AI 일정 추가 기능
    @PostMapping("/schedule/ai")
    public String aiSchedule(@RequestParam String message) throws Exception {
        // AI가 문장을 분석해 일정을 DB에 저장
        ollamaScheduleService.extractSchedule(message);
        
        // 추가 완료 후 타임라인 페이지로 새로고침
        return "redirect:/timeline";
    }
}