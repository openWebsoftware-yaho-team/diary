package com.yaho.diary.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yaho.diary.Dto.AiScheduleDto;
import com.yaho.diary.Entity.Schedule;
import com.yaho.diary.Repository.ScheduleRepository;

@Service
public class OllamaScheduleService {
    private final ScheduleRepository scheduleRepository;

    public OllamaScheduleService(
            ScheduleRepository scheduleRepository
    ) {
        this.scheduleRepository = scheduleRepository;
    }
    
    private final RestTemplate restTemplate =
            new RestTemplate();

    public AiScheduleDto extractSchedule(
            String userMessage
    ) throws Exception {

        String today =
                LocalDate.now().toString();

        String prompt = """
        너는 일정 관리 AI야.

        사용자의 요청이
        일정 추가(add),
        일정 수정(update),
        일정 삭제(delete)
        중 무엇인지 판단해.

        반드시 JSON만 출력해.
        설명 금지.

        현재 날짜는 %s 야.

        반환 형식:
        {
        "action": "add | update | delete",
        "title": "",
        "date": "YYYY-MM-DD",
        "startTime": "HH:mm",
        "endTime": "HH:mm",
        "category": "",
        "targetTitle": "",
        "targetDate": ""
        }

        규칙:

        1.
        category는 반드시
        회의, 공부, 약속, 운동, 기타
        중 하나만 사용.

        2.
        title을 사용자가 정하지 않았다면
        category와 동일하게 설정.

        3.
        endTime을 사용자가 정하지 않았다면
        startTime 기준 1시간 뒤로 설정.

        4.
        삭제(delete) 또는 수정(update)의 경우
        targetTitle과 targetDate에
        수정/삭제 대상 일정을 넣어.

        5.
        추가(add)의 경우
        targetTitle과 targetDate는 null.

        사용자 입력:
        %s
            """.formatted(today, userMessage);

        Map<String, Object> request =
                new HashMap<>();

        request.put("model", "qwen2.5:3b");
        request.put("prompt", prompt);
        request.put("stream", false);

        Map response =
                restTemplate.postForObject(
                        "http://localhost:11434/api/generate",
                        request,
                        Map.class
                );

        String responseText =
                response.get("response").toString();

        ObjectMapper mapper =
                new ObjectMapper();

        AiScheduleDto dto =
                mapper.readValue(
                        responseText,
                        AiScheduleDto.class
                );

        switch (dto.getAction()) {

        case "add":
                Schedule schedule = new Schedule();

                schedule.setTitle(dto.getTitle());

                schedule.setDate(
                        LocalDate.parse(dto.getDate())
                );

                schedule.setStartTime(
                        LocalTime.parse(dto.getStartTime())
                );

                if (dto.getEndTime() != null &&
                !dto.getEndTime().isBlank()) {

                schedule.setEndTime(
                        LocalTime.parse(dto.getEndTime())
                );
                }

                schedule.setCategory(dto.getCategory());

                scheduleRepository.save(schedule);

                break;

        case "delete":
                System.out.println("delete");
                // 나중에 삭제 코드 넣을 곳
                break;

        case "update":
                System.out.println("update");
                // 나중에 수정 코드 넣을 곳
                break;

        default:
                throw new RuntimeException("알 수 없는 작업입니다.");
        }

        return dto;
    }
}