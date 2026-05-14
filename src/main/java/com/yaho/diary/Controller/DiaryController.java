package com.yaho.diary.Controller;

import com.yaho.diary.Entity.Schedule;
import com.yaho.diary.Repository.ScheduleRepository;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Controller
public class DiaryController {

    private final ScheduleRepository scheduleRepository;

    public DiaryController(ScheduleRepository scheduleRepository) {
        this.scheduleRepository = scheduleRepository;
    }

    @GetMapping("/")
    public String home(Model model) {
        LocalDate today = LocalDate.now();
        LocalDate mon = today.with(DayOfWeek.MONDAY);
        LocalDate sun = mon.plusDays(6);

        List<Schedule> allSchedules = scheduleRepository.findAll();

        // 이번 주 일정
        List<Schedule> weekSchedules = allSchedules.stream()
                .filter(s -> !s.getDate().isBefore(mon) && !s.getDate().isAfter(sun))
                .sorted((a, b) -> {
                    int dateCmp = a.getDate().compareTo(b.getDate());
                    if (dateCmp != 0) return dateCmp;
                    if (a.getStartTime() == null) return 1;
                    if (b.getStartTime() == null) return -1;
                    return a.getStartTime().compareTo(b.getStartTime());
                })
                .collect(Collectors.toList());

        // 오늘 일정
        long todayCount = weekSchedules.stream()
                .filter(s -> s.getDate().equals(today))
                .count();

        model.addAttribute("weekSchedules", weekSchedules);
        model.addAttribute("weekTotal", weekSchedules.size());
        model.addAttribute("todayCount", todayCount);
        model.addAttribute("today", today);

        return "index";
    }

    @GetMapping("/login")
    public String login() {
        return "login";
    }
}