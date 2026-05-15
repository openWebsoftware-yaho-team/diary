package com.yaho.diary.Controller;

import com.yaho.diary.Entity.Schedule;
import com.yaho.diary.Repository.ScheduleRepository;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

// 요일, 날짜 처리를 위해 가져옴
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors; //List 변환에 사용

@Controller
public class DiaryController 
{

    private final ScheduleRepository scheduleRepository;

    public DiaryController(ScheduleRepository scheduleRepository) 
    {
        this.scheduleRepository = scheduleRepository;
    }

    @GetMapping("/")
    public String home(Model model) 
    {
        LocalDate today = LocalDate.now();
        
        // 이번주 월요일, 일요일 구하기
        LocalDate mon = today.with(DayOfWeek.MONDAY);
        LocalDate sun = mon.plusDays(6);

        List<Schedule> allSchedules = scheduleRepository.findAll();

        // 전체 일정 중 이번주(월~일) 해당하는 것만 필터링 후 날짜/시간 순으로 정렬
        List<Schedule> weekSchedules = allSchedules.stream()
                // 1주일 필터
                .filter(s -> !s.getDate().isBefore(mon) && !s.getDate().isAfter(sun))
                .sorted((a, b) -> 
                {   //날짜 오름차순으로 비교
                    int dateCmp = a.getDate().compareTo(b.getDate());

                    //날짜가 다르면 날짜 기준으로 정렬 끝
                    if (dateCmp != 0) return dateCmp;

                    // 시작 시간이 없으면(null) 매 뒤로
                    if (a.getStartTime() == null) return 1;
                    if (b.getStartTime() == null) return -1;

                    //날짜 같으면 시작 시간 오름차순
                    return a.getStartTime().compareTo(b.getStartTime());
                }).collect(Collectors.toList());
                //결과를 List로 변환

        // 이번주 일정 중 오늘 날짜와 일치하는 것만 카운트
        long todayCount = weekSchedules.stream().filter(s -> s.getDate().equals(today)).count();

        // 뷰에 데이터 전달
        model.addAttribute("weekSchedules", weekSchedules); // 이벉주 전체 일정
        model.addAttribute("weekTotal", weekSchedules.size()); //이번주 일정 총 개수
        model.addAttribute("todayCount", todayCount); // 오늘 일정 개수
        model.addAttribute("today", today); // 오늘의 날짜

        return "index";
    }

    @GetMapping("/login")
    public String login() 
    {
        return "login";
    }
}