package com.yaho.diary.Controller;

import com.yaho.diary.Dto.FixedScheduleDto;
import com.yaho.diary.Entity.FixedSchedule;
import com.yaho.diary.Repository.FixedScheduleRepository;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Optional;

@Controller
public class FixedScheduleController 
{

    private final FixedScheduleRepository fixedScheduleRepository;

    //생성자
    public FixedScheduleController(FixedScheduleRepository fixedScheduleRepository) 
    {
        this.fixedScheduleRepository = fixedScheduleRepository;
    }

    // 고정 일정 추가
    @PostMapping("/fixed/add")
    public String addFixed(@ModelAttribute FixedScheduleDto dto) 
    {
        // 저장
        FixedSchedule fs = new FixedSchedule();
        fs.setTitle(dto.getTitle());
        fs.setDayOfWeek(dto.getDayOfWeek());
        fs.setStartTime(dto.getStartTime());
        fs.setEndTime(dto.getEndTime());
        fs.setCategory(dto.getCategory());

        // 종료 날짜가 있다면 파싱해서 저장 ㄱㄱ
        String endDate = dto.getEndDate();

        if (endDate != null && !endDate.isBlank()) 
        {
            fs.setEndDate(LocalDate.parse(endDate));
        }
        fixedScheduleRepository.save(fs);
        return "redirect:/timeline";
    }

    // 고정 일정 수정
    @PostMapping("/fixed/update/{id}")
    public String updateFixed(@PathVariable Long id, @ModelAttribute FixedScheduleDto dto) {
        Optional<FixedSchedule> found = fixedScheduleRepository.findById(id);
        
        // 존재하지 않는 id라면 그냥 return
        if (found.isEmpty()) return "redirect:/timeline";

        FixedSchedule fs = found.get();
        fs.setTitle(dto.getTitle());
        fs.setDayOfWeek(dto.getDayOfWeek());
        fs.setStartTime(dto.getStartTime());
        fs.setEndTime(dto.getEndTime());
        fs.setCategory(dto.getCategory());

        String endDate = dto.getEndDate();
        if (endDate != null && !endDate.isBlank()) 
        {
            fs.setEndDate(LocalDate.parse(endDate));
        } 
        else // 종료 날짜 안 정해져 있으면 null로 초기화 
        {
            fs.setEndDate(null);
        }
        fixedScheduleRepository.save(fs);
        return "redirect:/timeline";
    }

    // 고정 일정 삭제
    @PostMapping("/fixed/delete/{id}")
    public String deleteFixed(@PathVariable Long id) {
        fixedScheduleRepository.deleteById(id);
        return "redirect:/timeline";
    }
}