package com.yaho.diary.Controller;

import com.yaho.diary.Entity.Schedule;
import com.yaho.diary.Entity.SiteUser;
import com.yaho.diary.Repository.ScheduleRepository;
import com.yaho.diary.Repository.SiteUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/user")
public class UserController 
{

    private final SiteUserRepository siteUserRepository;
    private final ScheduleRepository scheduleRepository; // 통계 계산용으로 추가
    private final BCryptPasswordEncoder passwordEncoder;

    public UserController(SiteUserRepository siteUserRepository, 
                          ScheduleRepository scheduleRepository, 
                          BCryptPasswordEncoder passwordEncoder) 
    {
        this.siteUserRepository = siteUserRepository;
        this.scheduleRepository = scheduleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    //회원 정보 + 스트릭 + 카테고리 통계 종합 조회
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyInfo(Principal principal) 
    {
        Map<String, Object> response = new HashMap<>();
        if (principal == null) 
        {
            response.put("message", "로그인이 필요합니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        SiteUser user = siteUserRepository.findByUsername(principal.getName());
        if (user == null) 
        {
            response.put("message", "유저를 찾을 수 없습니다.");
            return ResponseEntity.badRequest().body(response);
        }

        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("theme", user.getTheme());
        response.put("defaultCategory", user.getDefaultCategory());

        //[스트릭 계산] 연속으로 일정을 등록한 일수 계산.. 백준 그거 비슷한 거
        List<LocalDate> distinctDates = scheduleRepository.findAll().stream()
                .map(Schedule::getDate)
                .distinct()
                .sorted(Comparator.reverseOrder())
                .collect(Collectors.toList());

        int streak = 0;
        LocalDate checkDate = LocalDate.now();
        
        // 오늘 일정이 없으면 어제부터 스트릭이 유지되고 있는지 체크
        if (!distinctDates.contains(checkDate) && distinctDates.contains(checkDate.minusDays(1))) 
        {
            checkDate = checkDate.minusDays(1);
        }

        while (distinctDates.contains(checkDate)) 
        {
            streak++;
            checkDate = checkDate.minusDays(1);
        }
        response.put("streak", streak);

        //[카테고리 비율 통계] 각 카테고리별 개수 집계
        List<Schedule> allSchedules = scheduleRepository.findByUser(user);
        Map<String, Integer> catStats = new HashMap<>();

        // 기본 카테고리 종류들 초기화
        for (String cat : Arrays.asList("회의", "공부", "약속", "운동", "기타")) 
        {
            catStats.put(cat, 0);
        }

        for (Schedule s : allSchedules) 
        {
            String cat = s.getCategory();
            if (catStats.containsKey(cat)) 
            {
                catStats.put(cat, catStats.get(cat) + 1);
            } 
            else 
            {
                catStats.put("기타", catStats.get("기타") + 1);
            }
        }
        response.put("categoryStats", catStats);
        response.put("totalSchedules", allSchedules.size());

        return ResponseEntity.ok(response);
    }

    //테마 및 기본 카테고리 설정 업데이트
    @PutMapping("/settings")
    public ResponseEntity<Map<String, String>> updateSettings(Principal principal, @RequestBody Map<String, String> payload) 
    {
        Map<String, String> response = new HashMap<>();
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        SiteUser user = siteUserRepository.findByUsername(principal.getName());
        if (payload.containsKey("theme")) user.setTheme(payload.get("theme"));
        if (payload.containsKey("defaultCategory")) user.setDefaultCategory(payload.get("defaultCategory"));
        
        siteUserRepository.save(user);
        response.put("message", "개인 설정이 저장되었습니다.");

        return ResponseEntity.ok(response);
    }

    //비밀번호 변경 로직
    @PutMapping("/update-password")
    public ResponseEntity<Map<String, String>> updatePassword(Principal principal, @RequestBody Map<String, String> payload) 
    {
        Map<String, String> response = new HashMap<>();
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        SiteUser user = siteUserRepository.findByUsername(principal.getName());
        if (!passwordEncoder.matches(payload.get("currentPassword"), user.getPassword())) 
        {
            response.put("message", "현재 비밀번호가 일치하지 않습니다.");
            return ResponseEntity.badRequest().body(response);
        }

        user.setPassword(passwordEncoder.encode(payload.get("newPassword")));
        siteUserRepository.save(user);
        response.put("message", "비밀번호가 변경되었습니다.");

        return ResponseEntity.ok(response);
    }

    //회원 탈퇴 (영구 삭제)
    @DeleteMapping("/withdraw")
    public ResponseEntity<Map<String, String>> withdrawAccount(Principal principal, HttpServletRequest request) 
    {
        Map<String, String> response = new HashMap<>();
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        SiteUser user = siteUserRepository.findByUsername(principal.getName());
        if (user != null) {
            siteUserRepository.delete(user);
            // 탈퇴 처리 후 서버 세션 강제 만료 처리
            request.getSession().invalidate();
            response.put("message", "회원 탈퇴가 정상적으로 완료되었습니다. 그동안 이용해 주셔서 감사합니다.");

            return ResponseEntity.ok(response);
        }

        response.put("message", "탈퇴 처리에 실패했습니다.");
        
        return ResponseEntity.badRequest().body(response);
    }
}