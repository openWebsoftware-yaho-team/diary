package com.yaho.diary.Controller;

import com.yaho.diary.Dto.FixedScheduleDto;
import com.yaho.diary.Entity.FixedSchedule;
import com.yaho.diary.Repository.FixedScheduleRepository;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Optional;

@Controller
public class FixedScheduleController {

    private final FixedScheduleRepository fixedScheduleRepository;

    public FixedScheduleController(FixedScheduleRepository fixedScheduleRepository) {
        this.fixedScheduleRepository = fixedScheduleRepository;
    }

    // 고정 일정 추가
    @PostMapping("/fixed/add")
    public String addFixed(@ModelAttribute FixedScheduleDto dto) {
        FixedSchedule fs = new FixedSchedule();
        fs.setTitle(dto.getTitle());
        fs.setDayOfWeek(dto.getDayOfWeek());
        fs.setStartTime(dto.getStartTime());
        fs.setEndTime(dto.getEndTime());
        fs.setCategory(dto.getCategory());
        if (dto.getEndDate() != null && !dto.getEndDate().isBlank()) {
            fs.setEndDate(LocalDate.parse(dto.getEndDate()));
        }
        fixedScheduleRepository.save(fs);
        return "redirect:/timeline";
    }

    // 고정 일정 수정
    @PostMapping("/fixed/update/{id}")
    public String updateFixed(
            @PathVariable Long id,
            @ModelAttribute FixedScheduleDto dto
    ) {
        Optional<FixedSchedule> opt = fixedScheduleRepository.findById(id);
        if (opt.isPresent()) {
            FixedSchedule fs = opt.get();
            fs.setTitle(dto.getTitle());
            fs.setDayOfWeek(dto.getDayOfWeek());
            fs.setStartTime(dto.getStartTime());
            fs.setEndTime(dto.getEndTime());
            fs.setCategory(dto.getCategory());
            fs.setEndDate(dto.getEndDate() != null && !dto.getEndDate().isBlank()
                    ? LocalDate.parse(dto.getEndDate()) : null);
            fixedScheduleRepository.save(fs);
        }
        return "redirect:/timeline";
    }

    // 고정 일정 삭제
    @PostMapping("/fixed/delete/{id}")
    public String deleteFixed(@PathVariable Long id) {
        fixedScheduleRepository.deleteById(id);
        return "redirect:/timeline";
    }
}