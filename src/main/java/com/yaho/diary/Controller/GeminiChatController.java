package com.yaho.diary.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yaho.diary.Dto.AiApplyProposalRequestDto;
import com.yaho.diary.Dto.AiApplyResultDto;
import com.yaho.diary.Dto.AiChatRequestDto;
import com.yaho.diary.Dto.AiChatResponseDto;
import com.yaho.diary.Service.GeminiService;

@RestController
@RequestMapping("/api/gemini")
public class GeminiChatController 
{

    private final GeminiService geminiService;

    public GeminiChatController(GeminiService geminiService) 
    {
        this.geminiService = geminiService;
    }

    @PostMapping("/chat")
    public ResponseEntity<AiChatResponseDto> chat(@RequestBody AiChatRequestDto request) throws Exception 
    {
        String message = request.getMessage() != null ? request.getMessage().trim() : "";
        if (message.isBlank()) 
        {
            AiChatResponseDto empty = new AiChatResponseDto();
            empty.setReply("메시지를 입력해 주세요.");
            return ResponseEntity.ok(empty);
        }

        AiChatResponseDto response = geminiService.proposeSchedule
        (
                message,
                request.getHistory(),
                request.getCurrentProposals()
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/apply")
    public ResponseEntity<AiApplyResultDto> apply(@RequestBody AiApplyProposalRequestDto request)
    {
        AiApplyResultDto result = geminiService.applyProposal(request.getItems(), request.getRemovals(), request.getEdits());
        return ResponseEntity.ok(result);
    }
}
