package com.yaho.diary.Controller;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;

import com.yaho.diary.Entity.SiteUser;
import com.yaho.diary.Repository.SiteUserRepository;

@Controller
public class SignupController 
{

    private final SiteUserRepository siteUserRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    // 생성자~
    public SignupController(SiteUserRepository siteUserRepository, BCryptPasswordEncoder passwordEncoder) 
    {
        this.siteUserRepository = siteUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // 회원가입 화면
    @GetMapping("/signup")
    public String signup() 
    { 
        return "signup"; 
    }

    // 회원가입 처리
    @PostMapping("/signup")
    public String signup(String username, String password) 
    {
        SiteUser user = new SiteUser();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password)); // 암호화처리
        siteUserRepository.save(user);
        return "redirect:/login";
    }
}