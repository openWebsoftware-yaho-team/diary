package com.yaho.diary.Repository;

import com.yaho.diary.Entity.FixedCompletion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FixedCompletionRepository extends JpaRepository<FixedCompletion, Long> {
    Optional<FixedCompletion> findByFixedIdAndDate(Long fixedId, String date);
}