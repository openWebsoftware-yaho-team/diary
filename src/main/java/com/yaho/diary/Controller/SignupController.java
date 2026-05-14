package com.yaho.diary.Controller;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;

import com.yaho.diary.Entity.SiteUser;
import com.yaho.diary.Repository.SiteUserRepository;

@Controller
public class SignupController {

    private final SiteUserRepository siteUserRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public SignupController(SiteUserRepository siteUserRepository,
                            BCryptPasswordEncoder passwordEncoder) {
        this.siteUserRepository = siteUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/signup")
    public String signup() {
        return "signup";
    }

    @PostMapping("/signup")
    public String signup(String username, String password) {
        SiteUser user = new SiteUser();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        siteUserRepository.save(user);
        return "redirect:/login";
    }
}