package com.yaho.diary.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yaho.diary.Dto.AiScheduleDto;
import com.yaho.diary.Entity.FixedSchedule;
import com.yaho.diary.Entity.Schedule;
import com.yaho.diary.Repository.FixedScheduleRepository;
import com.yaho.diary.Repository.ScheduleRepository;

@Service
public class OllamaScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final FixedScheduleRepository fixedScheduleRepository;
    private final RestTemplate restTemplate;

    private static final String[] DAY_NAMES = {"월", "화", "수", "목", "금", "토", "일"};

    public OllamaScheduleService(
            ScheduleRepository scheduleRepository,
            FixedScheduleRepository fixedScheduleRepository
    ) {
        this.scheduleRepository = scheduleRepository;
        this.fixedScheduleRepository = fixedScheduleRepository;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30000);
        factory.setReadTimeout(120000);
        this.restTemplate = new RestTemplate(factory);
    }

    public AiScheduleDto extractSchedule(String userMessage) throws Exception {

        LocalDate today = LocalDate.now();
        String todayStr = today + " (" + today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.KOREAN) + ")";

        LocalDate mon = today.with(DayOfWeek.MONDAY);
        String weekInfo = String.format(
            "이번주 날짜:\n월요일: %s\n화요일: %s\n수요일: %s\n목요일: %s\n금요일: %s\n토요일: %s\n일요일: %s",
            mon, mon.plusDays(1), mon.plusDays(2), mon.plusDays(3),
            mon.plusDays(4), mon.plusDays(5), mon.plusDays(6)
        );

        List<FixedSchedule> fixedList = fixedScheduleRepository.findAll().stream()
                .filter(f -> f.getEndDate() == null || !f.getEndDate().isBefore(today))
                .collect(Collectors.toList());

        String fixedInfo = fixedList.isEmpty()
                ? "없음"
                : fixedList.stream()
                    .map(f -> String.format("- %s: 매주 %s요일 %s~%s",
                            f.getTitle(), DAY_NAMES[f.getDayOfWeek()],
                            f.getStartTime(), f.getEndTime()))
                    .collect(Collectors.joining("\n"));

        String prompt = """
            너는 일정 관리 AI야. 반드시 JSON만 출력해. 설명 금지.

            현재 날짜: %s
            %s

            기존 고정 일정 (매주 반복, 이미 예약된 시간):
            %s

            위 고정 일정 시간대와 겹치지 않게 일정을 추가해줘.

            [action 판단 기준]
            - "매주", "정기적으로", "항상", "고정", "매번" 같은 말이 있으면 → add_fixed
            - 특정 날짜/요일만 언급하면 → add
            - 삭제 요청 → delete
            - 수정 요청 → update

            반환 형식:
            {
            "action": "add | add_fixed | update | delete",
            "title": "",
            "date": "YYYY-MM-DD 또는 null",
            "startTime": "HH:mm",
            "endTime": "HH:mm",
            "category": "",
            "dayOfWeek": null,
            "targetTitle": "",
            "targetDate": ""
            }

            규칙:
            1. category는 반드시 회의, 공부, 약속, 운동, 기타 중 하나만 사용.
            2. title을 사용자가 정하지 않았다면 category와 동일하게 설정.
            3. endTime을 사용자가 정하지 않았다면 startTime 기준 1시간 뒤로 설정.
            4. add_fixed: dayOfWeek 필수 (0=월,1=화,2=수,3=목,4=금,5=토,6=일), date는 반드시 null.
            5. add: date 필수, dayOfWeek는 반드시 null.
            6. 삭제/수정: targetTitle과 targetDate에 대상 정보를 넣어.

            사용자 입력:
            %s
            """.formatted(todayStr, weekInfo, fixedInfo, userMessage);

        Map<String, Object> reqBody = new HashMap<>();
        reqBody.put("model", "qwen2.5:3b");
        reqBody.put("prompt", prompt);
        reqBody.put("stream", false);

        Map response = restTemplate.postForObject(
                "http://localhost:11434/api/generate",
                reqBody,
                Map.class
        );

        String raw = response.get("response").toString();
        if (raw.contains("{")) {
            raw = raw.substring(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
        }

        AiScheduleDto dto = new ObjectMapper().readValue(raw, AiScheduleDto.class);

        switch (dto.getAction()) {

            case "add":
                if (dto.getDate() == null || dto.getDate().isBlank()) break;
                Schedule newSchedule = new Schedule();
                newSchedule.setTitle(dto.getTitle());
                newSchedule.setDate(LocalDate.parse(dto.getDate()));
                newSchedule.setStartTime(LocalTime.parse(dto.getStartTime()));
                if (dto.getEndTime() != null && !dto.getEndTime().isBlank()) {
                    newSchedule.setEndTime(LocalTime.parse(dto.getEndTime()));
                }
                newSchedule.setCategory(dto.getCategory());
                scheduleRepository.save(newSchedule);
                break;

            case "add_fixed":
                if (dto.getDayOfWeek() == null || dto.getStartTime() == null || dto.getStartTime().isBlank()) break;
                FixedSchedule newFixed = new FixedSchedule();
                newFixed.setTitle(dto.getTitle() != null ? dto.getTitle() : "고정일정");
                newFixed.setDayOfWeek(dto.getDayOfWeek());
                newFixed.setStartTime(dto.getStartTime());
                if (dto.getEndTime() != null && !dto.getEndTime().isBlank()) {
                    newFixed.setEndTime(dto.getEndTime());
                } else {
                    newFixed.setEndTime(LocalTime.parse(dto.getStartTime()).plusHours(1).toString());
                }
                newFixed.setCategory(dto.getCategory() != null ? dto.getCategory() : "기타");
                fixedScheduleRepository.save(newFixed);
                break;

            case "delete":
                if (dto.getTargetTitle() != null && dto.getTargetDate() != null && !dto.getTargetDate().isBlank()) {
                    LocalDate delDate = LocalDate.parse(dto.getTargetDate());
                    scheduleRepository.findAll().stream()
                        .filter(s -> s.getTitle().equals(dto.getTargetTitle()) && s.getDate().equals(delDate))
                        .forEach(scheduleRepository::delete);
                }
                break;

            case "update":
                if (dto.getTargetTitle() != null && dto.getTargetDate() != null && !dto.getTargetDate().isBlank()) {
                    LocalDate updDate = LocalDate.parse(dto.getTargetDate());
                    scheduleRepository.findAll().stream()
                        .filter(s -> s.getTitle().equals(dto.getTargetTitle()) && s.getDate().equals(updDate))
                        .findFirst()
                        .ifPresent(s -> {
                            s.setTitle(dto.getTitle());
                            if (dto.getStartTime() != null) s.setStartTime(LocalTime.parse(dto.getStartTime()));
                            if (dto.getEndTime() != null && !dto.getEndTime().isBlank())
                                s.setEndTime(LocalTime.parse(dto.getEndTime()));
                            scheduleRepository.save(s);
                        });
                }
                break;

            default:
                throw new RuntimeException("알 수 없는 action: " + dto.getAction());
        }

        return dto;
    }
}