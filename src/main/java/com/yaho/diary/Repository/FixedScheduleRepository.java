package com.yaho.diary.Repository;

import com.yaho.diary.Entity.FixedSchedule;
import com.yaho.diary.Entity.SiteUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FixedScheduleRepository extends JpaRepository<FixedSchedule, Long> {
    List<FixedSchedule> findByUser(SiteUser user);
}