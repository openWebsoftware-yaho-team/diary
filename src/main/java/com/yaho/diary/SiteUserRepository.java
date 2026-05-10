package com.yaho.diary;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SiteUserRepository
        extends JpaRepository<SiteUser, Long> {

    SiteUser findByUsername(String username);
}