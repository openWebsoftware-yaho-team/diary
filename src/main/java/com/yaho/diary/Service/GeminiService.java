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
import com.yaho.diary.Dto.AiApplyResultDto;
import com.yaho.diary.Dto.AiChatMessageDto;
import com.yaho.diary.Dto.AiChatResponseDto;
import com.yaho.diary.Dto.AiProposalOptionDto;
import com.yaho.diary.Dto.AiProposedEditItem;
import com.yaho.diary.Dto.AiProposedRemovalItem;
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

    private static final String[] DAY_NAMES = {"월", "화", "수", "목", "금", "토", "일"};

    public GeminiService(ScheduleRepository scheduleRepository, FixedScheduleRepository fixedScheduleRepository)
    {
        this.scheduleRepository = scheduleRepository;
        this.fixedScheduleRepository = fixedScheduleRepository;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public AiChatResponseDto proposeSchedule(String userMessage, List<AiChatMessageDto> history, List<AiProposalOptionDto> currentProposals) throws Exception {
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
                  "removals": [
                    {
                      "title": "삭제할 등록 일정 제목",
                      "date": "YYYY-MM-DD",
                      "startTime": "HH:mm"
                    }
                  ],
                  "edits": [
                    {
                      "targetTitle": "수정할 기존 일정의 현재 제목",
                      "targetDate": "수정할 기존 일정의 현재 날짜 YYYY-MM-DD",
                      "targetStartTime": "수정할 기존 일정의 현재 시작시간 HH:mm",
                      "title": "바꿀 제목 (안 바꾸면 생략/기존값)",
                      "date": "바꿀 날짜 YYYY-MM-DD (안 바꾸면 생략)",
                      "startTime": "바꿀 시작시간 HH:mm (안 바꾸면 생략)",
                      "endTime": "바꿀 종료시간 HH:mm (안 바꾸면 생략)",
                      "category": "바꿀 카테고리 (안 바꾸면 생략)"
                    }
                  ],
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
                      ],
                      "removals": [
                        {
                          "title": "삭제할 등록 일정 제목",
                          "date": "YYYY-MM-DD",
                          "startTime": "HH:mm"
                        }
                      ],
                      "edits": [
                        {
                          "targetTitle": "수정할 기존 일정 제목",
                          "targetDate": "YYYY-MM-DD",
                          "targetStartTime": "HH:mm",
                          "title": "바꿀 제목",
                          "startTime": "바꿀 시작시간 HH:mm",
                          "endTime": "바꿀 종료시간 HH:mm",
                          "category": "바꿀 카테고리"
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
                10. 사용자가 등록된 일정 삭제·취소·없애달라고 하면, "이번 주에 이미 등록된 일반 일정"에서 해당 항목을 찾아 removals(또는 proposals[].removals)에 넣어. title·date·startTime은 등록된 일정과 정확히 일치시켜
                11. 삭제만 요청하고 새 시간표가 필요 없으면 proposals는 [] 이고 removals만 채워
                12. proposals[].items는 새로 추가할 일정만 (이미 DB에 있는 일정은 items에 넣지 말 것)
                13. 사용자가 등록된 일정의 시간/제목/날짜/카테고리를 "바꿔/옮겨/변경/수정"해 달라고 하면 삭제+추가가 아니라 edits 를 사용해. target* 에는 "이번 주에 이미 등록된 일반 일정"의 현재 값을 정확히 넣고, 바뀌는 필드만 새 값으로 채워
                14. 수정만 요청하고 새 시간표가 필요 없으면 proposals는 [] 이고 edits만 채워 (해당 일정을 removals/items에 중복으로 넣지 말 것)

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

    private void normalizeProposals(AiChatResponseDto response)
    {
        if (response.getProposals() != null && !response.getProposals().isEmpty())
        {
            return;
        }
        if (response.getItems() != null && !response.getItems().isEmpty())
        {
            AiProposalOptionDto single = new AiProposalOptionDto();
            single.setLabel("제안 시간표");
            single.setItems(response.getItems());
            response.setProposals(List.of(single));
        }
    }

    private String makeCurrentDraftInfo(List<AiProposalOptionDto> currentProposals)
    {
        if (currentProposals == null || currentProposals.isEmpty())
        {
            return "현재 화면의 제안 초안: 없음 (새로 작성)";
        }

        try
        {
            return "현재 화면의 제안 초안 (사용자가 수정을 요청하면 이를 기반으로 proposals 전체를 갱신):\n" + objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(currentProposals);
        }
        catch (Exception e)
        {
            return "현재 화면의 제안 초안: (파싱 불가)";
        }
    }

    public AiApplyResultDto applyProposal(List<AiProposedScheduleItem> items,
                                          List<AiProposedRemovalItem> removals,
                                          List<AiProposedEditItem> edits)
    {
        AiApplyResultDto result = new AiApplyResultDto();

        // 1) 삭제 먼저 → 자리를 비워 줌
        int removedCount = applyRemovals(removals);
        result.setRemovedCount(removedCount);

        // 2) 기존 일정 수정
        EditOutcome editOutcome = applyEdits(edits);
        result.setUpdatedCount(editOutcome.updatedCount);

        // 3) 신규 추가 (겹침 검사)
        List<AiProposedScheduleItem> addConflicts = findConflicts(items);

        int addedCount = 0;
        if (addConflicts.isEmpty() && items != null)
        {
            for (AiProposedScheduleItem item : items)
            {
                if (item.getDate() == null || item.getDate().isBlank() || item.getStartTime() == null || item.getStartTime().isBlank())
                {
                    continue;
                }

                Schedule s = new Schedule();
                s.setTitle(item.getTitle() != null && !item.getTitle().isBlank() ? item.getTitle() : "일정");
                s.setDate(LocalDate.parse(item.getDate()));
                s.setStartTime(LocalTime.parse(normalizeTime(item.getStartTime())));

                if (item.getEndTime() != null && !item.getEndTime().isBlank())
                {
                    s.setEndTime(LocalTime.parse(normalizeTime(item.getEndTime())));
                }
                else
                {
                    s.setEndTime(s.getStartTime().plusHours(1));
                }

                s.setCategory(item.getCategory() != null && !item.getCategory().isBlank() ? item.getCategory() : "기타");
                scheduleRepository.save(s);
                addedCount++;
            }
        }
        result.setAddedCount(addedCount);

        List<AiProposedScheduleItem> allConflicts = new ArrayList<>(editOutcome.conflicts);
        allConflicts.addAll(addConflicts);
        result.setConflicts(allConflicts);
        result.setSuccess(allConflicts.isEmpty());

        List<String> parts = new ArrayList<>();
        if (addedCount > 0) parts.add(addedCount + "개 추가");
        if (editOutcome.updatedCount > 0) parts.add(editOutcome.updatedCount + "개 수정");
        if (removedCount > 0) parts.add(removedCount + "개 삭제");

        String message = parts.isEmpty() ? "반영할 변경 사항이 없습니다." : String.join(", ", parts) + "가 반영되었습니다.";
        if (!allConflicts.isEmpty())
        {
            message += " (" + allConflicts.size() + "개 항목은 기존 일정과 겹쳐 반영하지 못했습니다.)";
        }
        result.setMessage(message);

        return result;
    }

    private static class EditOutcome
    {
        int updatedCount = 0;
        List<AiProposedScheduleItem> conflicts = new ArrayList<>();
    }

    private EditOutcome applyEdits(List<AiProposedEditItem> edits)
    {
        EditOutcome outcome = new EditOutcome();
        if (edits == null || edits.isEmpty())
        {
            return outcome;
        }

        List<FixedSchedule> fixedList = fixedScheduleRepository.findAll();

        for (AiProposedEditItem edit : edits)
        {
            if (edit.getTargetTitle() == null || edit.getTargetDate() == null || edit.getTargetDate().isBlank())
            {
                continue;
            }

            LocalDate targetDate = LocalDate.parse(edit.getTargetDate());
            List<Schedule> matched = scheduleRepository.findAll()
                    .stream()
                    .filter(s -> s.getDate().equals(targetDate) && s.getTitle().equals(edit.getTargetTitle()))
                    .toList();

            if (edit.getTargetStartTime() != null && !edit.getTargetStartTime().isBlank())
            {
                LocalTime targetStart = LocalTime.parse(normalizeTime(edit.getTargetStartTime()));
                matched = matched.stream()
                        .filter(s -> s.getStartTime().equals(targetStart))
                        .toList();
            }

            if (matched.isEmpty())
            {
                continue;
            }

            Schedule target = matched.get(0);

            LocalDate origDate = target.getDate();
            LocalTime origStart = target.getStartTime();
            LocalTime origEnd = target.getEndTime() != null ? target.getEndTime() : origStart.plusHours(1);

            LocalDate newDate = (edit.getDate() != null && !edit.getDate().isBlank())
                    ? LocalDate.parse(edit.getDate())
                    : origDate;
            LocalTime newStart = (edit.getStartTime() != null && !edit.getStartTime().isBlank())
                    ? LocalTime.parse(normalizeTime(edit.getStartTime()))
                    : origStart;

            LocalTime newEnd;
            if (edit.getEndTime() != null && !edit.getEndTime().isBlank())
            {
                newEnd = LocalTime.parse(normalizeTime(edit.getEndTime()));
            }
            else if (edit.getStartTime() != null && !edit.getStartTime().isBlank())
            {
                // 시작만 바뀌면 기존 길이 유지
                long durMin = java.time.Duration.between(origStart, origEnd).toMinutes();
                if (durMin <= 0) durMin = 60;
                newEnd = newStart.plusMinutes(durMin);
            }
            else
            {
                newEnd = origEnd;
            }

            // 자기 자신을 제외한 기존 일정/고정 일정과 겹침 검사
            Long targetId = target.getId();
            List<Schedule> others = scheduleRepository.findByDateBetween(
                            newDate.with(DayOfWeek.MONDAY), newDate.with(DayOfWeek.MONDAY).plusDays(6))
                    .stream()
                    .filter(s -> !s.getId().equals(targetId))
                    .toList();

            if (hasExistingConflict(others, newDate, newStart, newEnd) || hasFixedConflict(fixedList, newDate, newStart, newEnd))
            {
                AiProposedScheduleItem conflict = new AiProposedScheduleItem();
                conflict.setTitle(edit.getTitle() != null && !edit.getTitle().isBlank() ? edit.getTitle() : target.getTitle());
                conflict.setDate(newDate.toString());
                conflict.setStartTime(newStart.toString());
                conflict.setEndTime(newEnd.toString());
                conflict.setCategory(target.getCategory());
                outcome.conflicts.add(conflict);
                continue;
            }

            if (edit.getTitle() != null && !edit.getTitle().isBlank())
            {
                target.setTitle(edit.getTitle());
            }
            target.setDate(newDate);
            target.setStartTime(newStart);
            target.setEndTime(newEnd);
            if (edit.getCategory() != null && !edit.getCategory().isBlank())
            {
                target.setCategory(edit.getCategory());
            }

            scheduleRepository.save(target);
            outcome.updatedCount++;
        }

        return outcome;
    }

    public List<AiProposedScheduleItem> findConflicts(List<AiProposedScheduleItem> items)
    {
        List<AiProposedScheduleItem> conflicts = new ArrayList<>();
        if (items == null || items.isEmpty())
        {
            return conflicts;
        }

        LocalDate today = LocalDate.now();
        LocalDate mon = today.with(DayOfWeek.MONDAY);
        LocalDate sun = mon.plusDays(6);
        List<Schedule> existing = scheduleRepository.findByDateBetween(mon, sun);
        List<FixedSchedule> fixedList = fixedScheduleRepository.findAll();

        for (int i = 0; i < items.size(); i++)
        {
            AiProposedScheduleItem item = items.get(i);
            if (item.getDate() == null || item.getDate().isBlank() || item.getStartTime() == null || item.getStartTime().isBlank())
            {
                continue;
            }

            LocalDate date = LocalDate.parse(item.getDate());
            LocalTime start = LocalTime.parse(normalizeTime(item.getStartTime()));
            LocalTime end = resolveEndTime(item.getStartTime(), item.getEndTime());

            if (hasExistingConflict(existing, date, start, end))
            {
                conflicts.add(item);
                continue;
            }

            if (hasFixedConflict(fixedList, date, start, end))
            {
                conflicts.add(item);
                continue;
            }

            for (int j = 0; j < i; j++)
            {
                AiProposedScheduleItem other = items.get(j);
                if (other.getDate() == null || !other.getDate().equals(item.getDate()))
                {
                    continue;
                }
                if (other.getStartTime() == null || other.getStartTime().isBlank())
                {
                    continue;
                }
                LocalTime otherStart = LocalTime.parse(normalizeTime(other.getStartTime()));
                LocalTime otherEnd = resolveEndTime(other.getStartTime(), other.getEndTime());
                if (timesOverlap(start, end, otherStart, otherEnd))
                {
                    conflicts.add(item);
                    break;
                }
            }
        }

        return conflicts;
    }

    private int applyRemovals(List<AiProposedRemovalItem> removals)
    {
        if (removals == null || removals.isEmpty())
        {
            return 0;
        }

        int count = 0;
        for (AiProposedRemovalItem removal : removals)
        {
            if (removal.getTitle() == null || removal.getDate() == null || removal.getDate().isBlank())
            {
                continue;
            }

            LocalDate delDate = LocalDate.parse(removal.getDate());
            List<Schedule> matched = scheduleRepository.findAll()
                    .stream()
                    .filter(s -> s.getDate().equals(delDate) && s.getTitle().equals(removal.getTitle()))
                    .toList();

            if (removal.getStartTime() != null && !removal.getStartTime().isBlank())
            {
                LocalTime targetStart = LocalTime.parse(normalizeTime(removal.getStartTime()));
                matched = matched.stream()
                        .filter(s -> s.getStartTime().equals(targetStart))
                        .toList();
            }

            for (Schedule s : matched)
            {
                scheduleRepository.delete(s);
                count++;
            }
        }
        return count;
    }

    private boolean hasExistingConflict(List<Schedule> existing, LocalDate date, LocalTime start, LocalTime end)
    {
        for (Schedule s : existing)
        {
            if (!s.getDate().equals(date) || s.getStartTime() == null)
            {
                continue;
            }
            LocalTime sEnd = s.getEndTime() != null ? s.getEndTime() : s.getStartTime().plusHours(1);
            if (timesOverlap(start, end, s.getStartTime(), sEnd))
            {
                return true;
            }
        }
        return false;
    }

    private boolean hasFixedConflict(List<FixedSchedule> fixedList, LocalDate date, LocalTime start, LocalTime end)
    {
        int dbDay = date.getDayOfWeek().getValue() - 1;

        for (FixedSchedule f : fixedList)
        {
            if (f.getDayOfWeek() == null || f.getDayOfWeek() != dbDay)
            {
                continue;
            }
            if (f.getStartDate() != null && f.getStartDate().isAfter(date))
            {
                continue;
            }
            if (f.getEndDate() != null && f.getEndDate().isBefore(date))
            {
                continue;
            }
            if (f.getStartTime() == null || f.getStartTime().isBlank())
            {
                continue;
            }

            LocalTime fStart = LocalTime.parse(normalizeTime(f.getStartTime()));
            LocalTime fEnd = f.getEndTime() != null && !f.getEndTime().isBlank()
                    ? LocalTime.parse(normalizeTime(f.getEndTime()))
                    : fStart.plusHours(1);

            if (timesOverlap(start, end, fStart, fEnd))
            {
                return true;
            }
        }
        return false;
    }

    private boolean timesOverlap(LocalTime start1, LocalTime end1, LocalTime start2, LocalTime end2)
    {
        return start1.isBefore(end2) && start2.isBefore(end1);
    }

    private LocalTime resolveEndTime(String startTime, String endTime)
    {
        if (endTime != null && !endTime.isBlank())
        {
            return LocalTime.parse(normalizeTime(endTime));
        }
        return LocalTime.parse(normalizeTime(startTime)).plusHours(1);
    }

    private String normalizeTime(String time)
    {
        if (time == null || time.isBlank())
        {
            return "00:00";
        }
        return time.length() >= 5 ? time.substring(0, 5) : time;
    }

    public AiScheduleDto extractSchedule(String userMessage) throws Exception
    {
        LocalDate today = LocalDate.now();
        String todayStr = today + " (" + today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.KOREAN) + ")";
        LocalDate mon = today.with(DayOfWeek.MONDAY);
        LocalDate sun = mon.plusDays(6);
        String weekInfo = makeWeekInfo(mon);
        String now = LocalTime.now().withSecond(0).withNano(0).toString();
        String fixedInfo = makeFixedInfo(today);
        String existingInfo = makeExistingSchedulesInfo(mon, sun);

        String prompt = """
                너는 일정 관리 AI야.
                반드시 JSON만 출력해. 설명 금지. 코드블럭 금지.

                현재 날짜: %s
                현재 시간: %s
                %s

                이번 주 등록된 일반 일정 (일반 일정 삭제/수정 시 targetTitle, targetDate, targetStartTime을 이 목록에서 정확히 가져와):
                %s

                고정(루틴) 일정 (고정 일정 삭제/수정 시 targetTitle, targetDayOfWeek를 이 목록에서 정확히 가져와):
                %s

                [action 판단 기준]
                - 일정의 종류 먼저 구분: "고정"/"루틴"/"매주"/"정기"/"항상"/"매번" 관련이면 고정(fixed), 아니면 일반
                - 고정 일정 추가 → add_fixed
                - 일반 일정 추가 → add
                - 일반 일정 삭제/취소/없애 → delete
                - 일반 일정 변경/수정/옮겨/바꿔 → update
                - 고정(루틴) 일정 삭제/취소/없애 → delete_fixed
                - 고정(루틴) 일정 변경/수정/옮겨/바꿔 → update_fixed

                반환 형식:
                {
                  "action": "add | add_fixed | update | delete | update_fixed | delete_fixed",
                  "title": "새 제목",
                  "date": "YYYY-MM-DD 또는 null",
                  "startTime": "HH:mm",
                  "endTime": "HH:mm",
                  "category": "회의|공부|약속|운동|기타",
                  "dayOfWeek": null,
                  "targetTitle": "수정·삭제 대상 현재 제목",
                  "targetDate": "일반 일정 수정·삭제 대상 현재 날짜 YYYY-MM-DD",
                  "targetStartTime": "수정·삭제 대상 현재 시작시간 HH:mm",
                  "targetDayOfWeek": null
                }

                규칙:
                1. category는 반드시 회의, 공부, 약속, 운동, 기타 중 하나
                2. title 미지정 시 category와 동일하게
                3. endTime 미지정 시 startTime + 1시간
                4. add_fixed: dayOfWeek 필수(0=월~6=일), date는 반드시 null
                5. add: date 필수, dayOfWeek는 반드시 null
                6. delete/update: targetTitle, targetDate, targetStartTime은 "이번 주 등록된 일반 일정" 목록의 값과 정확히 일치
                7. delete_fixed/update_fixed: targetTitle과 targetDayOfWeek는 "고정(루틴) 일정" 목록의 값과 정확히 일치 (targetDate는 null)
                8. update_fixed에서 요일을 바꾸면 dayOfWeek에 새 요일, 시간을 바꾸면 startTime/endTime에 새 시간을 넣어
                9. startTime 미지정 시 현재 시간 기준 1시간 뒤
                10. 시간 형식은 반드시 HH:mm (초 없이)
                11. JSON 객체만 출력

                사용자 입력: %s
                """.formatted(todayStr, now, weekInfo, existingInfo, fixedInfo, userMessage);

        String rawJson = callGemini(prompt);

        System.out.println("Gemini extractSchedule 결과:");
        System.out.println(rawJson);

        AiScheduleDto dto = objectMapper.readValue(rawJson, AiScheduleDto.class);

        handleSchedule(dto);

        return dto;
    }

    private String makeWeekInfo(LocalDate mon)
    {
        return String.format("이번주 날짜:\n월요일: %s\n화요일: %s\n수요일: %s\n목요일: %s\n금요일: %s\n토요일: %s\n일요일: %s",
                mon, mon.plusDays(1), mon.plusDays(2), mon.plusDays(3), mon.plusDays(4), mon.plusDays(5), mon.plusDays(6));
    }

    private String makeExistingSchedulesInfo(LocalDate mon, LocalDate sun)
    {
        List<Schedule> weekSchedules = scheduleRepository.findByDateBetween(mon, sun);
        if (weekSchedules.isEmpty())
        {
            return "없음";
        }

        StringBuilder sb = new StringBuilder();
        for (Schedule s : weekSchedules)
        {
            sb.append("- ") .append(s.getDate()) .append(" ") .append(s.getTitle()) .append(" ") .append(s.getStartTime())
                    .append("~") .append(s.getEndTime() != null ? s.getEndTime() : "") .append(" (") .append(s.getCategory()) .append(")\n");
        }
        return sb.toString();
    }

    private String makeChatHistory(List<AiChatMessageDto> history)
    {
        if (history == null || history.isEmpty())
        {
            return "";
        }

        StringBuilder sb = new StringBuilder("이전 대화:\n");
        int start = Math.max(0, history.size() - 6);
        for (int i = start; i < history.size(); i++)
        {
            AiChatMessageDto m = history.get(i);
            if (m.getRole() == null || m.getContent() == null) continue;
            String label = "user".equals(m.getRole()) ? "사용자" : "AI";
            sb.append(label).append(": ").append(m.getContent()).append("\n");
        }
        return sb.toString();
    }

    private String makeFixedInfo(LocalDate today)
    {
        List<FixedSchedule> fixedList = fixedScheduleRepository.findAll();
        List<FixedSchedule> filteredList = new ArrayList<>();

        for (FixedSchedule f : fixedList)
        {
            if (f.getEndDate() == null || !f.getEndDate().isBefore(today))
            {
                filteredList.add(f);
            }
        }

        if (filteredList.isEmpty())
        {
            return "없음";
        }

        String fixedInfo = "";

        for (FixedSchedule f : filteredList)
        {
            fixedInfo += "- " + f.getTitle() + ": 매주 " + DAY_NAMES[f.getDayOfWeek()] + "요일(dayOfWeek=" + f.getDayOfWeek() + ") "
                    + f.getStartTime() + "~" + f.getEndTime() + "\n";
        }

        return fixedInfo;
    }

    private String callGemini(String prompt) throws Exception
    {
        // 과부하(503)/쿼터(429) 시 다른 모델로 폴백하며 재시도
        String[] models = {"gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"};

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
        HttpEntity<String> request = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);

        RuntimeException lastError = null;

        for (String model : models)
        {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + model + ":generateContent?key=" + apiKey;

            // 각 모델당 최대 3회 재시도 (지수 백오프)
            for (int attempt = 1; attempt <= 3; attempt++)
            {
                try
                {
                    ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
                    JsonNode root = objectMapper.readTree(response.getBody());

                    String resultText = root.get("candidates")
                            .get(0)
                            .get("content")
                            .get("parts")
                            .get(0)
                            .get("text")
                            .asText();

                    if (resultText.contains("{"))
                    {
                        resultText = resultText.substring(resultText.indexOf("{"), resultText.lastIndexOf("}") + 1);
                    }

                    return resultText;
                }
                catch (org.springframework.web.client.HttpServerErrorException
                        | org.springframework.web.client.HttpClientErrorException e)
                {
                    int status = e.getStatusCode().value();
                    lastError = e;

                    // 일시적 오류(503 과부하, 429 쿼터, 500)만 재시도
                    boolean retryable = status == 503 || status == 429 || status == 500;
                    System.out.println("Gemini 호출 실패 (model=" + model + ", attempt=" + attempt
                            + ", status=" + status + ", retryable=" + retryable + ")");

                    if (!retryable)
                    {
                        throw e;
                    }

                    if (attempt < 3)
                    {
                        try { Thread.sleep(500L * attempt); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
                    }
                }
                catch (Exception e)
                {
                    // 응답 파싱 실패 등
                    lastError = new RuntimeException("Gemini 응답 처리 실패: " + e.getMessage(), e);
                    throw lastError;
                }
            }
            // 다음 모델로 폴백
        }

        throw new RuntimeException("AI 서버가 일시적으로 혼잡합니다. 잠시 후 다시 시도해 주세요.", lastError);
    }

    private void handleSchedule(AiScheduleDto dto)
    {
        if (dto.getAction() == null)
        {
            System.out.println("action이 null이어서 처리 건너뜀");
            return;
        }

        switch (dto.getAction())
        {
            case "add"          -> addSchedule(dto);
            case "add_fixed"    -> addFixedSchedule(dto);
            case "delete"       -> deleteSchedule(dto);
            case "update"       -> updateSchedule(dto);
            case "delete_fixed" -> deleteFixedSchedule(dto);
            case "update_fixed" -> updateFixedSchedule(dto);
            default             -> System.out.println("알 수 없는 action: " + dto.getAction());
        }
    }

    private void addSchedule(AiScheduleDto dto)
    {
        System.out.println("일반 일정 추가 시작: " + dto.getTitle());

        if (dto.getDate() == null || dto.getDate().isBlank())
        {
            dto.setDate(LocalDate.now().toString());
        }

        Schedule newSchedule = new Schedule();
        newSchedule.setTitle(dto.getTitle() != null && !dto.getTitle().isBlank() ? dto.getTitle() : "일정");
        newSchedule.setDate(LocalDate.parse(dto.getDate().substring(0, 10)));
        newSchedule.setCategory(dto.getCategory() != null && !dto.getCategory().isBlank() ? dto.getCategory() : "기타");

        LocalTime start = LocalTime.now().plusHours(1).withSecond(0).withNano(0);
        if (dto.getStartTime() != null && !dto.getStartTime().isBlank())
        {
            start = LocalTime.parse(normalizeTime(dto.getStartTime()));
        }
        newSchedule.setStartTime(start);

        if (dto.getEndTime() != null && !dto.getEndTime().isBlank())
        {
            newSchedule.setEndTime(LocalTime.parse(normalizeTime(dto.getEndTime())));
        }
        else
        {
            newSchedule.setEndTime(start.plusHours(1));
        }

        scheduleRepository.save(newSchedule);
        System.out.println("일반 일정 추가 완료");
    }

    private void addFixedSchedule(AiScheduleDto dto)
    {
        System.out.println("고정 일정 추가 시작: " + dto.getTitle());

        if (dto.getDayOfWeek() == null || dto.getStartTime() == null || dto.getStartTime().isBlank())
        {
            System.out.println("고정 일정 추가 실패: dayOfWeek 또는 startTime 누락");
            return;
        }

        FixedSchedule newFixed = new FixedSchedule();
        newFixed.setTitle(dto.getTitle() != null && !dto.getTitle().isBlank() ? dto.getTitle() : "고정일정");
        newFixed.setDayOfWeek(dto.getDayOfWeek());
        newFixed.setCategory(dto.getCategory() != null && !dto.getCategory().isBlank() ? dto.getCategory() : "기타");

        String startNorm = normalizeTime(dto.getStartTime());
        newFixed.setStartTime(startNorm);

        if (dto.getEndTime() != null && !dto.getEndTime().isBlank())
        {
            newFixed.setEndTime(normalizeTime(dto.getEndTime()));
        }
        else
        {
            newFixed.setEndTime(LocalTime.parse(startNorm).plusHours(1).toString().substring(0, 5));
        }

        fixedScheduleRepository.save(newFixed);
        System.out.println("고정 일정 추가 완료");
    }

    private List<FixedSchedule> findTargetFixed(AiScheduleDto dto)
    {
        if (dto.getTargetTitle() == null || dto.getTargetTitle().isBlank())
        {
            return List.of();
        }

        String targetTitle = dto.getTargetTitle().strip();
        List<FixedSchedule> all = fixedScheduleRepository.findAll();

        // 요일이 주어지면 요일까지 일치
        List<FixedSchedule> matched;
        if (dto.getTargetDayOfWeek() != null)
        {
            matched = all.stream()
                    .filter(f -> f.getDayOfWeek() != null && f.getDayOfWeek().equals(dto.getTargetDayOfWeek())
                            && f.getTitle().equalsIgnoreCase(targetTitle))
                    .toList();
        }
        else
        {
            matched = all.stream()
                    .filter(f -> f.getTitle().equalsIgnoreCase(targetTitle))
                    .toList();
        }

        // 제목 포함 폴백
        if (matched.isEmpty())
        {
            matched = all.stream()
                    .filter(f -> f.getTitle().toLowerCase().contains(targetTitle.toLowerCase())
                            || targetTitle.toLowerCase().contains(f.getTitle().toLowerCase()))
                    .filter(f -> dto.getTargetDayOfWeek() == null
                            || (f.getDayOfWeek() != null && f.getDayOfWeek().equals(dto.getTargetDayOfWeek())))
                    .toList();
        }

        return matched;
    }

    private void deleteFixedSchedule(AiScheduleDto dto)
    {
        System.out.println("고정 일정 삭제 시작: targetTitle=" + dto.getTargetTitle() + ", targetDayOfWeek=" + dto.getTargetDayOfWeek());

        List<FixedSchedule> matched = findTargetFixed(dto);
        if (matched.isEmpty())
        {
            System.out.println("고정 일정 삭제 실패: 일치하는 루틴을 찾지 못함");
            return;
        }

        matched.forEach(fixedScheduleRepository::delete);
        System.out.println("고정 일정 삭제 완료: " + matched.size() + "개");
    }

    private void updateFixedSchedule(AiScheduleDto dto)
    {
        System.out.println("고정 일정 수정 시작: targetTitle=" + dto.getTargetTitle() + ", targetDayOfWeek=" + dto.getTargetDayOfWeek());

        List<FixedSchedule> matched = findTargetFixed(dto);
        if (matched.isEmpty())
        {
            System.out.println("고정 일정 수정 실패: 일치하는 루틴을 찾지 못함");
            return;
        }

        FixedSchedule f = matched.get(0);

        if (dto.getTitle() != null && !dto.getTitle().isBlank())
        {
            f.setTitle(dto.getTitle());
        }
        if (dto.getDayOfWeek() != null)
        {
            f.setDayOfWeek(dto.getDayOfWeek());
        }

        String origStart = f.getStartTime();
        String origEnd = f.getEndTime();

        if (dto.getStartTime() != null && !dto.getStartTime().isBlank())
        {
            String newStart = normalizeTime(dto.getStartTime());
            f.setStartTime(newStart);

            if (dto.getEndTime() != null && !dto.getEndTime().isBlank())
            {
                f.setEndTime(normalizeTime(dto.getEndTime()));
            }
            else if (origStart != null && origEnd != null)
            {
                // 시작만 바뀌면 기존 길이 유지
                long durMin = java.time.Duration.between(
                        LocalTime.parse(normalizeTime(origStart)),
                        LocalTime.parse(normalizeTime(origEnd))).toMinutes();
                if (durMin <= 0) durMin = 60;
                f.setEndTime(LocalTime.parse(newStart).plusMinutes(durMin).toString().substring(0, 5));
            }
            else
            {
                f.setEndTime(LocalTime.parse(newStart).plusHours(1).toString().substring(0, 5));
            }
        }
        else if (dto.getEndTime() != null && !dto.getEndTime().isBlank())
        {
            f.setEndTime(normalizeTime(dto.getEndTime()));
        }

        if (dto.getCategory() != null && !dto.getCategory().isBlank())
        {
            f.setCategory(dto.getCategory());
        }

        fixedScheduleRepository.save(f);
        System.out.println("고정 일정 수정 완료: " + f.getTitle());
    }

    private void deleteSchedule(AiScheduleDto dto)
    {
        System.out.println("삭제 시작: targetTitle=" + dto.getTargetTitle() + ", targetDate=" + dto.getTargetDate());

        if (dto.getTargetTitle() == null || dto.getTargetDate() == null || dto.getTargetDate().isBlank())
        {
            System.out.println("삭제 실패: targetTitle 또는 targetDate 누락");
            return;
        }

        LocalDate delDate = LocalDate.parse(dto.getTargetDate().substring(0, 10));
        String targetTitle = dto.getTargetTitle().strip();

        List<Schedule> candidates = scheduleRepository.findAll()
                .stream()
                .filter(s -> s.getDate().equals(delDate))
                .toList();

        // targetStartTime 있으면 정확하게, 없으면 제목만으로
        List<Schedule> matched;
        if (dto.getTargetStartTime() != null && !dto.getTargetStartTime().isBlank())
        {
            LocalTime targetStart = LocalTime.parse(normalizeTime(dto.getTargetStartTime()));
            matched = candidates.stream()
                    .filter(s -> s.getTitle().equalsIgnoreCase(targetTitle) && s.getStartTime().equals(targetStart))
                    .toList();
        }
        else
        {
            matched = candidates.stream()
                    .filter(s -> s.getTitle().equalsIgnoreCase(targetTitle))
                    .toList();
        }

        // 정확 일치 없으면 제목 포함으로 폴백
        if (matched.isEmpty())
        {
            matched = candidates.stream()
                    .filter(s -> s.getTitle().toLowerCase().contains(targetTitle.toLowerCase())
                            || targetTitle.toLowerCase().contains(s.getTitle().toLowerCase()))
                    .toList();
        }

        matched.forEach(scheduleRepository::delete);
        System.out.println("삭제 완료: " + matched.size() + "개");
    }

    private void updateSchedule(AiScheduleDto dto)
    {
        System.out.println("수정 시작: targetTitle=" + dto.getTargetTitle() + ", targetDate=" + dto.getTargetDate());

        if (dto.getTargetTitle() == null || dto.getTargetDate() == null || dto.getTargetDate().isBlank())
        {
            System.out.println("수정 실패: targetTitle 또는 targetDate 누락");
            return;
        }

        LocalDate updDate = LocalDate.parse(dto.getTargetDate().substring(0, 10));
        String targetTitle = dto.getTargetTitle().strip();

        List<Schedule> candidates = scheduleRepository.findAll()
                .stream()
                .filter(s -> s.getDate().equals(updDate))
                .toList();

        java.util.Optional<Schedule> found;
        if (dto.getTargetStartTime() != null && !dto.getTargetStartTime().isBlank())
        {
            LocalTime targetStart = LocalTime.parse(normalizeTime(dto.getTargetStartTime()));
            found = candidates.stream()
                    .filter(s -> s.getTitle().equalsIgnoreCase(targetTitle) && s.getStartTime().equals(targetStart))
                    .findFirst();
        }
        else
        {
            found = candidates.stream()
                    .filter(s -> s.getTitle().equalsIgnoreCase(targetTitle))
                    .findFirst();
        }

        // 제목 포함 폴백
        if (found.isEmpty())
        {
            found = candidates.stream()
                    .filter(s -> s.getTitle().toLowerCase().contains(targetTitle.toLowerCase())
                            || targetTitle.toLowerCase().contains(s.getTitle().toLowerCase()))
                    .findFirst();
        }

        found.ifPresent(s ->
        {
            LocalTime origStart = s.getStartTime();
            LocalTime origEnd = s.getEndTime() != null ? s.getEndTime() : origStart.plusHours(1);

            if (dto.getTitle() != null && !dto.getTitle().isBlank())
            {
                s.setTitle(dto.getTitle());
            }
            if (dto.getDate() != null && !dto.getDate().isBlank())
            {
                s.setDate(LocalDate.parse(dto.getDate().substring(0, 10)));
            }

            LocalTime newStart = origStart;
            if (dto.getStartTime() != null && !dto.getStartTime().isBlank())
            {
                newStart = LocalTime.parse(normalizeTime(dto.getStartTime()));
                s.setStartTime(newStart);
            }

            if (dto.getEndTime() != null && !dto.getEndTime().isBlank())
            {
                s.setEndTime(LocalTime.parse(normalizeTime(dto.getEndTime())));
            }
            else if (dto.getStartTime() != null && !dto.getStartTime().isBlank())
            {
                // 시작만 바뀌었으면 기존 길이 유지
                long durMin = java.time.Duration.between(origStart, origEnd).toMinutes();
                s.setEndTime(newStart.plusMinutes(durMin > 0 ? durMin : 60));
            }

            if (dto.getCategory() != null && !dto.getCategory().isBlank())
            {
                s.setCategory(dto.getCategory());
            }

            scheduleRepository.save(s);
            System.out.println("수정 완료: " + s.getTitle());
        });

        if (found.isEmpty())
        {
            System.out.println("수정 실패: 일치하는 일정을 찾지 못함");
        }
    }
}