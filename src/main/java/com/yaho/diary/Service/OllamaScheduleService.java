package com.yaho.diary.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
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
public class OllamaScheduleService
{
    private final ScheduleRepository scheduleRepository; // 일반 일정
    private final FixedScheduleRepository fixedScheduleRepository; // 고정 일정
    private final RestTemplate restTemplate; // ollama 요청용?

    private static final String[] DAY_NAMES = {"월", "화", "수", "목", "금", "토", "일"}; //요일 출력용

    public OllamaScheduleService(ScheduleRepository scheduleRepository, FixedScheduleRepository fixedScheduleRepository)
    {
        this.scheduleRepository = scheduleRepository;
        this.fixedScheduleRepository = fixedScheduleRepository;

        //tiemout 설정
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        
        factory.setConnectTimeout(30000);
        factory.setReadTimeout(120000);

        this.restTemplate = new RestTemplate(factory);
    }

    public AiScheduleDto extractSchedule(String userMessage) throws Exception
    {
        LocalDate today = LocalDate.now(); // 오늘 날짜
        String todayStr = today + " (" + today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.KOREAN) + ")"; // 오늘 날짜랑 요일

        LocalDate mon = today.with(DayOfWeek.MONDAY); // 이번주 월요일

        String weekInfo = String.format // 이번주 날짜
        (
            "이번주 날짜:\n월요일: %s\n화요일: %s\n수요일: %s\n목요일: %s\n금요일: %s\n토요일: %s\n일요일: %s",
            mon, mon.plusDays(1), mon.plusDays(2), mon.plusDays(3),
            mon.plusDays(4), mon.plusDays(5), mon.plusDays(6)
        );
        
        // 고정 일정
        List<FixedSchedule> fixedList = fixedScheduleRepository.findAll();
        List<FixedSchedule> filteredList = new ArrayList<>();

        // 안 끝난 일정
        for(FixedSchedule f : fixedList)
        {
            if(f.getEndDate() == null || !f.getEndDate().isBefore(today))
            {
                filteredList.add(f);
            }
        }

        // AI한테 줄 문자열?
        String fixedInfo = "";

        if(filteredList.isEmpty())
        {
            fixedInfo = "없음";
        }
        else
        {
            for(FixedSchedule f : filteredList)
            {
                fixedInfo += "- " + f.getTitle() + ": 매주 " + DAY_NAMES[f.getDayOfWeek()] + "요일 " +
                        f.getStartTime() + "~" + f.getEndTime() + "\n";
            }
        }

        String prompt = """
            너는 일정 관리 AI야
            반드시 JSON만 출력해, 설명 금지

            현재 날짜:
            %s
            
            %s

            기존 고정 일정:
            %s

            위 고정 일정 시간대와 겹치지 않게 일정을 추가해줘

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
            1. category는 반드시 회의, 공부, 약속, 운동, 기타 중 하나만 사용
            2. title을 사용자가 정하지 않았다면 category와 동일하게 설정
            3. endTime을 사용자가 정하지 않았다면 startTime 기준 1시간 뒤로 설정
            4. add_fixed: dayOfWeek 필수 (0=월,1=화,2=수,3=목,4=금,5=토,6=일), date는 반드시 null
            5. add: date 필수, dayOfWeek는 반드시 null
            6. 삭제/수정: targetTitle과 targetDate에 대상 정보를 넣어
            7. startTime이 없으면 현재 시간 기준 1시간 뒤를 사용

            사용자 입력:
            %s
            """.formatted(todayStr, weekInfo, fixedInfo, userMessage);

        Map<String, Object> reqBody = new HashMap<>(); // 요청할 거

        reqBody.put("model", "qwen2.5:3b");
        reqBody.put("prompt", prompt);
        reqBody.put("stream", false);

        Map response = restTemplate.postForObject // ollama한테 요청
        (
                "http://localhost:11434/api/generate",
                reqBody,
                Map.class
        );

        String raw = response.get("response").toString(); // 응답 문자열

        if (raw.contains("{")) // json 자르기
        {
            raw = raw.substring(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
        }

        // dto 변환
        AiScheduleDto dto = new ObjectMapper().readValue(raw, AiScheduleDto.class);

        switch (dto.getAction()) {
            case "add": // 일반 일정 추가
                System.out.println("일반 일정 추가 시작");
                if (dto.getDate() == null || dto.getDate().isBlank())
                {
                    dto.setDate(LocalDate.now().toString());
                }

                Schedule newSchedule = new Schedule();

                if(dto.getStartTime() != null && !dto.getStartTime().isBlank())
                {
                    newSchedule.setStartTime(LocalTime.parse(dto.getStartTime()));
                }
                
                newSchedule.setTitle(dto.getTitle());
                newSchedule.setDate(LocalDate.parse(dto.getDate()));
                newSchedule.setStartTime(LocalTime.parse(dto.getStartTime()));

                if (dto.getEndTime() != null && !dto.getEndTime().isBlank())
                {
                    newSchedule.setEndTime(LocalTime.parse(dto.getEndTime()));
                }

                newSchedule.setCategory(dto.getCategory());
                scheduleRepository.save(newSchedule);
                System.out.println("일반 일정 추가 끝");
                break;

            case "add_fixed": // 고정 일정 추가
                System.out.println("고정 일정 추가 시작");
                if (dto.getDayOfWeek() == null || dto.getStartTime() == null || dto.getStartTime().isBlank()) break;
                
                FixedSchedule newFixed = new FixedSchedule();
                
                newFixed.setTitle(dto.getTitle() != null ? dto.getTitle() : "고정일정");
                newFixed.setDayOfWeek(dto.getDayOfWeek());
                newFixed.setStartTime(dto.getStartTime());
                
                if (dto.getEndTime() != null && !dto.getEndTime().isBlank())
                {
                    newFixed.setEndTime(dto.getEndTime());
                }
                else
                {
                    newFixed.setEndTime(LocalTime.parse(dto.getStartTime()).plusHours(1).toString());
                }

                newFixed.setCategory(dto.getCategory() != null ? dto.getCategory() : "기타");
                fixedScheduleRepository.save(newFixed);
                System.out.println("고정 일정 추가 끝");

                break;

            case "delete": // 삭제
                System.out.println("삭제 시작");
                if (dto.getTargetTitle() != null && dto.getTargetDate() != null && !dto.getTargetDate().isBlank())
                {
                    LocalDate delDate = LocalDate.parse(dto.getTargetDate());

                    scheduleRepository.findAll().stream()
                        .filter(s -> s.getTitle().equals(dto.getTargetTitle()) && s.getDate().equals(delDate))
                        .forEach(scheduleRepository::delete);
                }
                System.out.println("삭제 끝");
                break;

            case "update": // 업데이트
                System.out.println("업데이트 시작");
                if (dto.getTargetTitle() != null && dto.getTargetDate() != null && !dto.getTargetDate().isBlank())
                {
                    LocalDate updDate = LocalDate.parse(dto.getTargetDate());

                    scheduleRepository.findAll().stream()
                        .filter(s -> s.getTitle().equals(dto.getTargetTitle()) && s.getDate().equals(updDate))
                        .findFirst()
                        .ifPresent(s ->
                        {
                            s.setTitle(dto.getTitle());

                            if (dto.getStartTime() != null)
                            {
                                s.setStartTime(LocalTime.parse(dto.getStartTime()));
                            }
                            if (dto.getEndTime() != null && !dto.getEndTime().isBlank())
                            {
                                s.setEndTime(LocalTime.parse(dto.getEndTime()));
                            }

                            scheduleRepository.save(s);
                        });
                }
                System.out.println("업데이트 끝");
                break;

            default:
                System.out.println("디폹트");
                throw new RuntimeException("알 수 없는 action: " + dto.getAction());
        }

        return dto;
    }
}