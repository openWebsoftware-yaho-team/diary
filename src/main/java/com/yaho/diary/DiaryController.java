package com.yaho.diary;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DiaryController {

    @GetMapping("/")
    public String home() {
        return "index";
    }

    @GetMapping("/login")
    public String login() {
        return "login";
    }
/* 
    @GetMapping("/signup")
    public String signup() {
        return "signup";
    }
*/
    // 타임라인, 캘린더 등도 미리 만들어둘 수 있습니다.
    @GetMapping("/timeline")
    public String timeline() { return "timeline"; }
}