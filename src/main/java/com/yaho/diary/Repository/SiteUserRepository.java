package com.yaho.diary.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.yaho.diary.Entity.SiteUser;

public interface SiteUserRepository extends JpaRepository<SiteUser, Long> {
    SiteUser findByUsername(String username);
}