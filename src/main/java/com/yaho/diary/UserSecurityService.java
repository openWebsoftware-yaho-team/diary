package com.yaho.diary;

import java.util.ArrayList;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserSecurityService implements UserDetailsService {

    private final SiteUserRepository siteUserRepository;

    public UserSecurityService(SiteUserRepository siteUserRepository) {
        this.siteUserRepository = siteUserRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {

        SiteUser siteUser = siteUserRepository.findByUsername(username);

        if (siteUser == null) {
            throw new UsernameNotFoundException("사용자를 찾을 수 없습니다.");
        }

        return new User(
                siteUser.getUsername(),
                siteUser.getPassword(),
                new ArrayList<>()
        );
    }
}