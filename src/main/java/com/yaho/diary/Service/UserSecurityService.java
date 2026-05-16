package com.yaho.diary.Service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.yaho.diary.Entity.SiteUser;
import com.yaho.diary.Repository.SiteUserRepository;

@Service
public class UserSecurityService implements UserDetailsService
{
    private final SiteUserRepository siteUserRepository; // 유저 정보 가져올 repo

    public UserSecurityService(SiteUserRepository siteUserRepository)
    {
        this.siteUserRepository = siteUserRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username)
        throws UsernameNotFoundException
        {
        SiteUser user = siteUserRepository.findByUsername(username); // 유저 찾기

        if (user == null) // 유저 없을 때
        {
            throw new UsernameNotFoundException("사용자를 찾을 수 없습니다.");
        }

        List<SimpleGrantedAuthority> authorities = new ArrayList<>(); // 권한 저장용 리스트

        authorities.add(new SimpleGrantedAuthority("ROLE_USER")); // 기본 권환 설정

        // spring security?에서 사용할 객체
        UserDetails userDetails = new User(
            user.getUsername(),
            user.getPassword(),
            new ArrayList<>()
        );

        return userDetails;
    }
}