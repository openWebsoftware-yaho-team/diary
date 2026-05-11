package com.yaho.diary.Repository;

import com.yaho.diary.Entity.FixedSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FixedScheduleRepository extends JpaRepository<FixedSchedule, Long> {
}