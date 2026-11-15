package com.pointwise.repository;

import java.time.LocalDateTime;
import com.pointwise.entity.Bill;
import com.pointwise.entity.BillStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BillRepository extends JpaRepository<Bill, Long> {
    List<Bill> findByStatus(BillStatus status);
    Optional<Bill> findByShareToken(String shareToken);
    List<Bill> findByDownlineIdAndStatusIn(Long downlineId, List<BillStatus> statuses);
    boolean existsByDownlineId(Long downlineId);
    List<Bill> findByDownlineIdAndIssuedAtBetween(Long downlineId, LocalDateTime from, LocalDateTime to);
}