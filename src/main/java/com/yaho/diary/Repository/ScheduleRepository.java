package com.yaho.diary.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.yaho.diary.Entity.Schedule;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
}