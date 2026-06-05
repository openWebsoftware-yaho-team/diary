package com.yaho.diary.Controller;

import com.yaho.diary.Dto.AiScheduleDto;
import com.yaho.diary.Service.GeminiService;
import org.springframework.web.bind.annotation.*;

@RestController
public class GeminiController 
{

    private final GeminiService geminiService;

    public GeminiController(GeminiService geminiService) 
    {
        this.geminiService = geminiService;
    }

    @GetMapping("/gemini")
    public AiScheduleDto gemini(@RequestParam String msg) throws Exception 
    {
        return geminiService.extractSchedule(msg);
    }
}