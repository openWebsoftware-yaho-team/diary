package com.yaho.diary.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.yaho.diary.Repository.ScheduleRepository;
import com.yaho.diary.Service.OllamaScheduleService;

import org.springframework.ui.Model;

@Controller
public class ScheduleController {

    private final OllamaScheduleService ollamaScheduleService;
    private final ScheduleRepository scheduleRepository;

    public ScheduleController(
            OllamaScheduleService ollamaScheduleService,
            ScheduleRepository scheduleRepository
    ) {
        this.ollamaScheduleService =
                ollamaScheduleService;

        this.scheduleRepository =
                scheduleRepository;
    }

    @GetMapping("/schedule")
    public String schedulePage(Model model) {

        model.addAttribute(
                "scheduleList",
                scheduleRepository.findAll()
        );

        return "schedule";
    }

    @PostMapping("/schedule/ai")
    public String aiSchedule(
            @RequestParam String message
    ) throws Exception {

        ollamaScheduleService.extractSchedule(message);

        return "redirect:/schedule";
    }
}