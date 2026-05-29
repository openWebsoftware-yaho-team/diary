package com.yaho.diary.Controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yaho.diary.Dto.AiApplyProposalRequestDto;
import com.yaho.diary.Dto.AiChatRequestDto;
import com.yaho.diary.Dto.AiChatResponseDto;
import com.yaho.diary.Service.GeminiService;

@RestController
@RequestMapping("/api/gemini")
public class GeminiChatController {

    private final GeminiService geminiService;

    public GeminiChatController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @PostMapping("/chat")
    public ResponseEntity<AiChatResponseDto> chat(@RequestBody AiChatRequestDto request) throws Exception {
        String message = request.getMessage() != null ? request.getMessage().trim() : "";
        if (message.isBlank()) {
            AiChatResponseDto empty = new AiChatResponseDto();
            empty.setReply("메시지를 입력해 주세요.");
            return ResponseEntity.ok(empty);
        }

        AiChatResponseDto response = geminiService.proposeSchedule(
                message,
                request.getHistory(),
                request.getCurrentProposals()
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/apply")
    public ResponseEntity<Map<String, Object>> apply(@RequestBody AiApplyProposalRequestDto request) {
        int count = geminiService.applyProposal(request.getItems());

        Map<String, Object> body = new HashMap<>();
        body.put("message", count > 0 ? count + "개 일정이 타임라인에 추가되었습니다." : "추가할 일정이 없습니다.");
        body.put("count", count);
        return ResponseEntity.ok(body);
    }
}
