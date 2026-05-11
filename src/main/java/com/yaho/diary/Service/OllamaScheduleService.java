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

    public OllamaScheduleService(
            ScheduleRepository scheduleRepository,
            FixedScheduleRepository fixedScheduleRepository
    ) {
        this.scheduleRepository = scheduleRepository;
        this.fixedScheduleRepository = fixedScheduleRepository;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30000);
        factory.setReadTimeout(120000); // 2분
        this.restTemplate = new RestTemplate(factory);
    }

    // 요일 숫자 → 한글
    private String getDayName(int dayOfWeek) {
        String[] days = {"월", "화", "수", "목", "금", "토", "일"};
        return days[dayOfWeek];
    }

    public AiScheduleDto extractSchedule(String userMessage) throws Exception {

        LocalDate now = LocalDate.now();

        // 오늘 요일 한글로
        String todayKor = now.getDayOfWeek()
                .getDisplayName(TextStyle.FULL, Locale.KOREAN);
        String today = now + " (" + todayKor + ")";

        // 이번 주 월~일 날짜 전부 계산
        LocalDate monday = now.with(DayOfWeek.MONDAY);
        String weekInfo = String.format(
            "이번주 날짜:\n월요일: %s\n화요일: %s\n수요일: %s\n목요일: %s\n금요일: %s\n토요일: %s\n일요일: %s",
            monday,
            monday.plusDays(1),
            monday.plusDays(2),
            monday.plusDays(3),
            monday.plusDays(4),
            monday.plusDays(5),
            monday.plusDays(6)
        );

        // 고정 일정 목록 (기한 지난 건 제외)
        List<FixedSchedule> fixedList = fixedScheduleRepository.findAll().stream()
                .filter(f -> f.getEndDate() == null || !f.getEndDate().isBefore(now))
                .collect(Collectors.toList());

        String fixedInfo = fixedList.isEmpty()
                ? "없음"
                : fixedList.stream()
                    .map(f -> String.format("- %s: 매주 %s요일 %s~%s",
                            f.getTitle(), getDayName(f.getDayOfWeek()),
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
            """.formatted(today, weekInfo, fixedInfo, userMessage);

        Map<String, Object> request = new HashMap<>();
        request.put("model", "qwen2.5:3b");
        request.put("prompt", prompt);
        request.put("stream", false);

        Map response = restTemplate.postForObject(
                "http://localhost:11434/api/generate",
                request,
                Map.class
        );

        String responseText = response.get("response").toString();

        // JSON 블록만 추출
        if (responseText.contains("{")) {
            int start = responseText.indexOf("{");
            int end = responseText.lastIndexOf("}") + 1;
            responseText = responseText.substring(start, end);
        }

        ObjectMapper mapper = new ObjectMapper();
        AiScheduleDto dto = mapper.readValue(responseText, AiScheduleDto.class);

        switch (dto.getAction()) {

            case "add":
                if (dto.getDate() == null || dto.getDate().isBlank()) break;
                Schedule schedule = new Schedule();
                schedule.setTitle(dto.getTitle());
                schedule.setDate(LocalDate.parse(dto.getDate()));
                schedule.setStartTime(LocalTime.parse(dto.getStartTime()));
                if (dto.getEndTime() != null && !dto.getEndTime().isBlank()) {
                    schedule.setEndTime(LocalTime.parse(dto.getEndTime()));
                }
                schedule.setCategory(dto.getCategory());
                scheduleRepository.save(schedule);
                break;

            case "add_fixed":
                if (dto.getDayOfWeek() == null) break;
                if (dto.getStartTime() == null || dto.getStartTime().isBlank()) break;
                FixedSchedule fixed = new FixedSchedule();
                fixed.setTitle(dto.getTitle() != null ? dto.getTitle() : "고정일정");
                fixed.setDayOfWeek(dto.getDayOfWeek());
                fixed.setStartTime(dto.getStartTime());
                // endTime 없으면 1시간 뒤로 자동 설정
                if (dto.getEndTime() != null && !dto.getEndTime().isBlank()) {
                    fixed.setEndTime(dto.getEndTime());
                } else {
                    LocalTime start = LocalTime.parse(dto.getStartTime());
                    fixed.setEndTime(start.plusHours(1).toString());
                }
                fixed.setCategory(dto.getCategory() != null ? dto.getCategory() : "기타");
                fixedScheduleRepository.save(fixed);
                break;

            case "delete":
                if (dto.getTargetTitle() != null && dto.getTargetDate() != null
                        && !dto.getTargetDate().isBlank()) {
                    LocalDate targetDate = LocalDate.parse(dto.getTargetDate());
                    scheduleRepository.findAll().stream()
                        .filter(s -> s.getTitle().equals(dto.getTargetTitle())
                                && s.getDate().equals(targetDate))
                        .forEach(s -> scheduleRepository.delete(s));
                }
                break;

            case "update":
                if (dto.getTargetTitle() != null && dto.getTargetDate() != null
                        && !dto.getTargetDate().isBlank()) {
                    LocalDate targetDate = LocalDate.parse(dto.getTargetDate());
                    scheduleRepository.findAll().stream()
                        .filter(s -> s.getTitle().equals(dto.getTargetTitle())
                                && s.getDate().equals(targetDate))
                        .findFirst()
                        .ifPresent(s -> {
                            s.setTitle(dto.getTitle());
                            if (dto.getStartTime() != null) s.setStartTime(LocalTime.parse(dto.getStartTime()));
                            if (dto.getEndTime() != null && !dto.getEndTime().isBlank()) s.setEndTime(LocalTime.parse(dto.getEndTime()));
                            scheduleRepository.save(s);
                        });
                }
                break;

            default:
                throw new RuntimeException("알 수 없는 작업입니다.");
        }

        return dto;
    }
}