package com.pointwise.repository;

import com.pointwise.entity.Downline;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DownlineRepository extends JpaRepository<Downline, Long> {
    Optional<Downline> findByConsultantId(String consultantId);
}