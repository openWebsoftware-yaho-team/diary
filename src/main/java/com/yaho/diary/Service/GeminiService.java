package com.yaho.diary.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yaho.diary.Dto.AiChatMessageDto;
import com.yaho.diary.Dto.AiChatResponseDto;
import com.yaho.diary.Dto.AiProposalOptionDto;
import com.yaho.diary.Dto.AiProposedScheduleItem;
import com.yaho.diary.Dto.AiScheduleDto;
import com.yaho.diary.Entity.FixedSchedule;
import com.yaho.diary.Entity.Schedule;
import com.yaho.diary.Repository.FixedScheduleRepository;
import com.yaho.diary.Repository.ScheduleRepository;

@Service
public class GeminiService {

    private final ScheduleRepository scheduleRepository;
    private final FixedScheduleRepository fixedScheduleRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key}")
    private String apiKey;

    private static final String[] DAY_NAMES =
            {"월", "화", "수", "목", "금", "토", "일"};

    public GeminiService(
            ScheduleRepository scheduleRepository,
            FixedScheduleRepository fixedScheduleRepository
    ) {
        this.scheduleRepository = scheduleRepository;
        this.fixedScheduleRepository = fixedScheduleRepository;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * 챗봇 상담: 일정 제안만 생성 (DB 저장 없음)
     */
    public AiChatResponseDto proposeSchedule(
            String userMessage,
            List<AiChatMessageDto> history,
            List<AiProposalOptionDto> currentProposals
    ) throws Exception {
        LocalDate today = LocalDate.now();
        LocalDate mon = today.with(DayOfWeek.MONDAY);
        LocalDate sun = mon.plusDays(6);

        String todayStr = today + " (" + today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.KOREAN) + ")";
        String now = LocalTime.now().withSecond(0).withNano(0).toString();
        String weekInfo = makeWeekInfo(mon);
        String fixedInfo = makeFixedInfo(today);
        String existingInfo = makeExistingSchedulesInfo(mon, sun);
        String chatHistory = makeChatHistory(history);
        String draftInfo = makeCurrentDraftInfo(currentProposals);

        String prompt = """
                너는 친절한 주간 일정 코치 AI야.
                사용자와 대화하며 시간표 초안을 함께 다듬어. 아직 DB 저장 전이므로 반드시 JSON만 출력. 설명·코드블럭 금지.

                현재 날짜: %s
                현재 시간: %s
                %s

                기존 고정 일정:
                %s

                이번 주에 이미 등록된 일반 일정:
                %s

                %s

                %s

                반환 형식:
                {
                  "reply": "자연스러운 한국어 답변 (변경 사항을 짧게 설명)",
                  "proposals": [
                    {
                      "label": "안 1 제목 (예: 일찍 자는 패턴)",
                      "items": [
                        {
                          "title": "일정 제목",
                          "date": "YYYY-MM-DD",
                          "startTime": "HH:mm",
                          "endTime": "HH:mm",
                          "category": "회의|공부|약속|운동|기타"
                        }
                      ]
                    }
                  ]
                }

                규칙:
                1. proposals[].items 날짜는 이번 주(월~일)만
                2. 고정·기존 일정과 겹치지 않게
                3. category는 회의, 공부, 약속, 운동, 기타 중 하나
                4. endTime 미정이면 startTime + 1시간
                5. 시간표 불필요한 질문이면 proposals는 빈 배열 []
                6. 기본은 proposals 1개(대화로 수정·추가 요청 시 이전 초안을 반영해 전체를 다시 작성)
                7. 사용자가 "두 가지 안", "비교" 등을 원할 때만 proposals 2개 (서로 다른 전략, 내용이 겹치면 안 됨)
                8. 수면·식사·휴식 포함 가능, 하루당 3~8블록 권장
                9. JSON 객체만 출력

                사용자 입력:
                %s
                """.formatted(todayStr, now, weekInfo, fixedInfo, existingInfo, chatHistory, draftInfo, userMessage);

        String rawJson = callGemini(prompt);
        System.out.println("Gemini 제안 결과:");
        System.out.println(rawJson);

        AiChatResponseDto response = objectMapper.readValue(rawJson, AiChatResponseDto.class);
        normalizeProposals(response);
        return response;
    }

    private void normalizeProposals(AiChatResponseDto response) {
        if (response.getProposals() != null && !response.getProposals().isEmpty()) {
            return;
        }
        if (response.getItems() != null && !response.getItems().isEmpty()) {
            AiProposalOptionDto single = new AiProposalOptionDto();
            single.setLabel("제안 시간표");
            single.setItems(response.getItems());
            response.setProposals(List.of(single));
        }
    }

    private String makeCurrentDraftInfo(List<AiProposalOptionDto> currentProposals) {
        if (currentProposals == null || currentProposals.isEmpty()) {
            return "현재 화면의 제안 초안: 없음 (새로 작성)";
        }

        try {
            return "현재 화면의 제안 초안 (사용자가 수정을 요청하면 이를 기반으로 proposals 전체를 갱신):\n"
                    + objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(currentProposals);
        } catch (Exception e) {
            return "현재 화면의 제안 초안: (파싱 불가)";
        }
    }

    /**
     * 사용자가 승인한 제안 일정을 타임라인(DB)에 반영
     */
    public int applyProposal(List<AiProposedScheduleItem> items) {
        if (items == null || items.isEmpty()) {
            return 0;
        }

        int count = 0;
        for (AiProposedScheduleItem item : items) {
            if (item.getDate() == null || item.getDate().isBlank()
                    || item.getStartTime() == null || item.getStartTime().isBlank()) {
                continue;
            }

            Schedule s = new Schedule();
            s.setTitle(item.getTitle() != null && !item.getTitle().isBlank() ? item.getTitle() : "일정");
            s.setDate(LocalDate.parse(item.getDate()));
            s.setStartTime(LocalTime.parse(item.getStartTime()));

            if (item.getEndTime() != null && !item.getEndTime().isBlank()) {
                s.setEndTime(LocalTime.parse(item.getEndTime()));
            } else {
                s.setEndTime(LocalTime.parse(item.getStartTime()).plusHours(1));
            }

            s.setCategory(item.getCategory() != null && !item.getCategory().isBlank() ? item.getCategory() : "기타");
            scheduleRepository.save(s);
            count++;
        }
        return count;
    }

    public AiScheduleDto extractSchedule(String userMessage) throws Exception {

        LocalDate today = LocalDate.now();

        String todayStr =
                today + " (" +
                today.getDayOfWeek()
                        .getDisplayName(TextStyle.FULL, Locale.KOREAN)
                + ")";

        LocalDate mon = today.with(DayOfWeek.MONDAY);

        String weekInfo = makeWeekInfo(mon);

        String now =
                LocalTime.now()
                        .withSecond(0)
                        .withNano(0)
                        .toString();

        String fixedInfo = makeFixedInfo(today);

        String prompt = """
                너는 일정 관리 AI야.
                반드시 JSON만 출력해. 설명 금지.

                현재 날짜:
                %s

                현재 시간:
                %s

                %s

                기존 고정 일정:
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
                1. category는 반드시 회의, 공부, 약속, 운동, 기타 중 하나만 사용
                2. title을 사용자가 정하지 않았다면 category와 동일하게 설정
                3. endTime을 사용자가 정하지 않았다면 startTime 기준 1시간 뒤로 설정
                4. add_fixed: dayOfWeek 필수 (0=월,1=화,2=수,3=목,4=금,5=토,6=일), date는 반드시 null
                5. add: date 필수, dayOfWeek는 반드시 null
                6. 삭제/수정: targetTitle과 targetDate에 대상 정보를 넣어
                7. startTime이 없으면 현재 시간 기준 1시간 뒤를 사용
                8. JSON 코드블럭 ```json 사용 금지
                9. 오직 JSON 객체만 출력

                사용자 입력:
                %s
                """.formatted(todayStr, now, weekInfo, fixedInfo, userMessage);

        String rawJson = callGemini(prompt);

        System.out.println("Gemini 결과:");
        System.out.println(rawJson);

        AiScheduleDto dto =
                objectMapper.readValue(rawJson, AiScheduleDto.class);

        handleSchedule(dto);

        return dto;
    }

    private String makeWeekInfo(LocalDate mon) {
        return String.format(
                "이번주 날짜:\n월요일: %s\n화요일: %s\n수요일: %s\n목요일: %s\n금요일: %s\n토요일: %s\n일요일: %s",
                mon,
                mon.plusDays(1),
                mon.plusDays(2),
                mon.plusDays(3),
                mon.plusDays(4),
                mon.plusDays(5),
                mon.plusDays(6)
        );
    }

    private String makeExistingSchedulesInfo(LocalDate mon, LocalDate sun) {
        List<Schedule> weekSchedules = scheduleRepository.findByDateBetween(mon, sun);
        if (weekSchedules.isEmpty()) {
            return "없음";
        }

        StringBuilder sb = new StringBuilder();
        for (Schedule s : weekSchedules) {
            sb.append("- ")
                    .append(s.getDate())
                    .append(" ")
                    .append(s.getTitle())
                    .append(" ")
                    .append(s.getStartTime())
                    .append("~")
                    .append(s.getEndTime() != null ? s.getEndTime() : "")
                    .append(" (")
                    .append(s.getCategory())
                    .append(")\n");
        }
        return sb.toString();
    }

    private String makeChatHistory(List<AiChatMessageDto> history) {
        if (history == null || history.isEmpty()) {
            return "";
        }

        StringBuilder sb = new StringBuilder("이전 대화:\n");
        int start = Math.max(0, history.size() - 6);
        for (int i = start; i < history.size(); i++) {
            AiChatMessageDto m = history.get(i);
            if (m.getRole() == null || m.getContent() == null) continue;
            String label = "user".equals(m.getRole()) ? "사용자" : "AI";
            sb.append(label).append(": ").append(m.getContent()).append("\n");
        }
        return sb.toString();
    }

    private String makeFixedInfo(LocalDate today) {

        List<FixedSchedule> fixedList =
                fixedScheduleRepository.findAll();

        List<FixedSchedule> filteredList = new ArrayList<>();

        for (FixedSchedule f : fixedList) {
            if (f.getEndDate() == null ||
                    !f.getEndDate().isBefore(today)) {
                filteredList.add(f);
            }
        }

        if (filteredList.isEmpty()) {
            return "없음";
        }

        String fixedInfo = "";

        for (FixedSchedule f : filteredList) {
            fixedInfo += "- " + f.getTitle()
                    + ": 매주 "
                    + DAY_NAMES[f.getDayOfWeek()]
                    + "요일 "
                    + f.getStartTime()
                    + "~"
                    + f.getEndTime()
                    + "\n";
        }

        return fixedInfo;
    }

    private String callGemini(String prompt) throws Exception {

        String url =
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="
                        + apiKey;

        JsonNode requestBody =
                objectMapper.readTree("""
                {
                  "contents": [
                    {
                      "parts": [
                        {
                          "text": ""
                        }
                      ]
                    }
                  ]
                }
                """);

        ((com.fasterxml.jackson.databind.node.ObjectNode)
                requestBody
                        .get("contents")
                        .get(0)
                        .get("parts")
                        .get(0))
                .put("text", prompt);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<String> request =
                new HttpEntity<>(
                        objectMapper.writeValueAsString(requestBody),
                        headers
                );

        ResponseEntity<String> response =
                restTemplate.postForEntity(
                        url,
                        request,
                        String.class
                );

        JsonNode root =
                objectMapper.readTree(response.getBody());

        String resultText =
                root.get("candidates")
                        .get(0)
                        .get("content")
                        .get("parts")
                        .get(0)
                        .get("text")
                        .asText();

        if (resultText.contains("{")) {
            resultText =
                    resultText.substring(
                            resultText.indexOf("{"),
                            resultText.lastIndexOf("}") + 1
                    );
        }

        return resultText;
    }

    private void handleSchedule(AiScheduleDto dto) {

        switch (dto.getAction()) {

            case "add":
                addSchedule(dto);
                break;

            case "add_fixed":
                addFixedSchedule(dto);
                break;

            case "delete":
                deleteSchedule(dto);
                break;

            case "update":
                updateSchedule(dto);
                break;

            default:
                throw new RuntimeException(
                        "알 수 없는 action: " + dto.getAction()
                );
        }
    }

    private void addSchedule(AiScheduleDto dto) {

        System.out.println("일반 일정 추가 시작");

        if (dto.getDate() == null || dto.getDate().isBlank()) {
            dto.setDate(LocalDate.now().toString());
        }

        Schedule newSchedule = new Schedule();

        newSchedule.setTitle(dto.getTitle());
        newSchedule.setDate(LocalDate.parse(dto.getDate()));

        if (dto.getStartTime() != null &&
                !dto.getStartTime().isBlank()) {
            newSchedule.setStartTime(
                    LocalTime.parse(dto.getStartTime())
            );
        }

        if (dto.getEndTime() != null &&
                !dto.getEndTime().isBlank()) {
            newSchedule.setEndTime(
                    LocalTime.parse(dto.getEndTime())
            );
        }

        newSchedule.setCategory(dto.getCategory());

        scheduleRepository.save(newSchedule);

        System.out.println("일반 일정 추가 끝");
    }

    private void addFixedSchedule(AiScheduleDto dto) {

        System.out.println("고정 일정 추가 시작");

        if (dto.getDayOfWeek() == null ||
                dto.getStartTime() == null ||
                dto.getStartTime().isBlank()) {
            return;
        }

        FixedSchedule newFixed = new FixedSchedule();

        newFixed.setTitle(
                dto.getTitle() != null ? dto.getTitle() : "고정일정"
        );

        newFixed.setDayOfWeek(dto.getDayOfWeek());
        newFixed.setStartTime(dto.getStartTime());

        if (dto.getEndTime() != null &&
                !dto.getEndTime().isBlank()) {
            newFixed.setEndTime(dto.getEndTime());
        } else {
            newFixed.setEndTime(
                    LocalTime.parse(dto.getStartTime())
                            .plusHours(1)
                            .toString()
            );
        }

        newFixed.setCategory(
                dto.getCategory() != null ? dto.getCategory() : "기타"
        );

        fixedScheduleRepository.save(newFixed);

        System.out.println("고정 일정 추가 끝");
    }

    private void deleteSchedule(AiScheduleDto dto) {

        System.out.println("삭제 시작");

        if (dto.getTargetTitle() == null ||
                dto.getTargetDate() == null ||
                dto.getTargetDate().isBlank()) {
            return;
        }

        LocalDate delDate =
                LocalDate.parse(dto.getTargetDate());

        scheduleRepository.findAll()
                .stream()
                .filter(s ->
                        s.getTitle().equals(dto.getTargetTitle()) &&
                        s.getDate().equals(delDate)
                )
                .forEach(scheduleRepository::delete);

        System.out.println("삭제 끝");
    }

    private void updateSchedule(AiScheduleDto dto) {

        System.out.println("업데이트 시작");

        if (dto.getTargetTitle() == null ||
                dto.getTargetDate() == null ||
                dto.getTargetDate().isBlank()) {
            return;
        }

        LocalDate updDate =
                LocalDate.parse(dto.getTargetDate());

        scheduleRepository.findAll()
                .stream()
                .filter(s ->
                        s.getTitle().equals(dto.getTargetTitle()) &&
                        s.getDate().equals(updDate)
                )
                .findFirst()
                .ifPresent(s -> {

                    if (dto.getTitle() != null &&
                            !dto.getTitle().isBlank()) {
                        s.setTitle(dto.getTitle());
                    }

                    if (dto.getStartTime() != null &&
                            !dto.getStartTime().isBlank()) {
                        s.setStartTime(
                                LocalTime.parse(dto.getStartTime())
                        );
                    }

                    if (dto.getEndTime() != null &&
                            !dto.getEndTime().isBlank()) {
                        s.setEndTime(
                                LocalTime.parse(dto.getEndTime())
                        );
                    }

                    if (dto.getCategory() != null &&
                            !dto.getCategory().isBlank()) {
                        s.setCategory(dto.getCategory());
                    }

                    scheduleRepository.save(s);
                });

        System.out.println("업데이트 끝");
    }
}