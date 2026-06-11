package com.yaho.diary.Repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import com.yaho.diary.Entity.Schedule;
import com.yaho.diary.Entity.SiteUser;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> 
{
    List<Schedule> findByDateBetween(LocalDate start, LocalDate end);
    List<Schedule> findByUser(SiteUser user);
    List<Schedule> findByUserAndDateBetween(SiteUser user, LocalDate start, LocalDate end);
}