package com.yaho.diary.Controller;

import com.yaho.diary.Dto.FixedScheduleDto;
import com.yaho.diary.Entity.FixedSchedule;
import com.yaho.diary.Repository.FixedScheduleRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/fixed")
public class FixedScheduleController {

    private final FixedScheduleRepository fixedScheduleRepository;

    public FixedScheduleController(FixedScheduleRepository fixedScheduleRepository) {
        this.fixedScheduleRepository = fixedScheduleRepository;
    }

    @PostMapping("/add")
    public ResponseEntity<Map<String, String>> addFixed(@RequestBody FixedScheduleDto dto) {
        FixedSchedule fs = new FixedSchedule();
        fs.setTitle(dto.getTitle());
        fs.setDayOfWeek(dto.getDayOfWeek());
        fs.setStartTime(dto.getStartTime());
        fs.setEndTime(dto.getEndTime());
        fs.setCategory(dto.getCategory());
        if (dto.getStartDate() != null && !dto.getStartDate().isBlank()) {
            fs.setStartDate(LocalDate.parse(dto.getStartDate()));
        } else {
            fs.setStartDate(LocalDate.now().with(java.time.DayOfWeek.MONDAY));
        }
        if (dto.getEndDate() != null && !dto.getEndDate().isBlank()) {
            fs.setEndDate(LocalDate.parse(dto.getEndDate()));
        }
        fixedScheduleRepository.save(fs);

        Map<String, String> response = new HashMap<>();
        response.put("message", "고정 일정이 추가되었습니다.");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<Map<String, String>> updateFixed(@PathVariable Long id, @RequestBody FixedScheduleDto dto) {
        Map<String, String> response = new HashMap<>();
        Optional<FixedSchedule> found = fixedScheduleRepository.findById(id);
        
        if (found.isPresent()) {
            FixedSchedule fs = found.get();
            fs.setTitle(dto.getTitle());
            fs.setDayOfWeek(dto.getDayOfWeek());
            fs.setStartTime(dto.getStartTime());
            fs.setEndTime(dto.getEndTime());
            fs.setCategory(dto.getCategory());
            fs.setEndDate(dto.getEndDate() != null && !dto.getEndDate().isBlank()
                    ? LocalDate.parse(dto.getEndDate()) : null);
            fixedScheduleRepository.save(fs);
            
            response.put("message", "고정 일정이 수정되었습니다.");
            return ResponseEntity.ok(response);
        }
        
        response.put("message", "해당 고정 일정을 찾을 수 없습니다.");
        return ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Map<String, String>> deleteFixed(@PathVariable Long id) {
        fixedScheduleRepository.deleteById(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "고정 일정이 삭제되었습니다.");
        return ResponseEntity.ok(response);
    }
}