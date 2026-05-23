package com.yaho.diary.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.yaho.diary.Entity.SiteUser;
import com.yaho.diary.Repository.SiteUserRepository;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class SignupController {

    private final SiteUserRepository siteUserRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public SignupController(SiteUserRepository siteUserRepository,
                            BCryptPasswordEncoder passwordEncoder) {
        this.siteUserRepository = siteUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // 회원가입 전송 API (JSON 수신)
    @PostMapping("/signup")
    public ResponseEntity<Map<String, String>> signup(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String password = payload.get("password");

        Map<String, String> response = new HashMap<>();

        // 아이디 중복 체크 로직 보완
        if (siteUserRepository.findByUsername(username) != null) {
            response.put("message", "이미 존재하는 사용자 아이디입니다.");
            return ResponseEntity.badRequest().body(response);
        }

        SiteUser user = new SiteUser();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        siteUserRepository.save(user);

        response.put("message", "회원가입이 완료되었습니다.");
        return ResponseEntity.ok(response);
    }
}