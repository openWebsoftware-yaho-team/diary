package com.yaho.diary.Repository;

import com.yaho.diary.Entity.FixedSkip;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FixedSkipRepository extends JpaRepository<FixedSkip, Long> 
{
    Optional<FixedSkip> findByFixedIdAndDate(Long fixedId, String date);
}