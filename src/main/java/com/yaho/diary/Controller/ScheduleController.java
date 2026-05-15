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
public class ScheduleController 
{

    private final OllamaScheduleService ollamaScheduleService;
    private final ScheduleRepository scheduleRepository;
    private final FixedScheduleRepository fixedScheduleRepository;

    //생성자
    public ScheduleController(OllamaScheduleService ollamaScheduleService, ScheduleRepository scheduleRepository, FixedScheduleRepository fixedScheduleRepository) 
    {
        this.ollamaScheduleService = ollamaScheduleService;
        this.scheduleRepository = scheduleRepository;
        this.fixedScheduleRepository = fixedScheduleRepository;
    }

    // 타임라인 페이지 - 일반 일정, 고정 일정을 넘김
    @GetMapping("/timeline")
    public String timelinePage(Model model) 
    {
        model.addAttribute("scheduleList", scheduleRepository.findAll());
        model.addAttribute("fixedList", fixedScheduleRepository.findAll());
        return "timeline";
    }

    //AI가 메세지에서 일정 추출 후 저장
    @PostMapping("/schedule/ai")
    public String aiSchedule(@RequestParam String message) throws Exception 
    {
        ollamaScheduleService.extractSchedule(message);
        return "redirect:/timeline";
    }

    // 일정 수정
    @PostMapping("/schedule/update")
    public String updateSchedule(@RequestParam Long id, @RequestParam String title,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime startTime,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime endTime) 
        {
        Optional<Schedule> found = scheduleRepository.findById(id); //id로 일정 조회
        if (found.isPresent()) // 있으면 수정함
        {
            Schedule s = found.get(); //Optional에서 꺼내기
            s.setTitle(title); s.setDate(date); // 제목, 날짜 수정
            s.setStartTime(startTime); s.setEndTime(endTime); // 시작, 종료 시간 수정
            scheduleRepository.save(s); 
        }
        return "redirect:/timeline";
    }

    // 일정 삭제
    @GetMapping("/schedule/delete")
    public String deleteSchedule(@RequestParam Long id) 
    {
        scheduleRepository.deleteById(id);
        return "redirect:/timeline";
    }

    // 캘린더 페이지로 넘어감
    @GetMapping("/calendar")
    public String calendarPage(Model model) 
    {
        model.addAttribute("scheduleList", scheduleRepository.findAll());
        return "calendar";
    }
}