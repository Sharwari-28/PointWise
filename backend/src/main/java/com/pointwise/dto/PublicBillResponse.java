package com.pointwise.dto;

import com.pointwise.entity.Bill;
import com.pointwise.entity.BillStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record PublicBillResponse(
        String billNo,
        BillStatus status,
        String downlineName,
        String brandPartner,
        List<BillResponse.ItemResponse> items,
        BigDecimal totalPoints,
        BigDecimal previousMonthPoints,
        BigDecimal monthPointsTotal,
        BigDecimal totalAmount,
        BigDecimal previousBalance,
        BigDecimal amountPaid,
        BigDecimal amountDue,
        LocalDateTime issuedAt
) {
    public static PublicBillResponse from(Bill b) {
        return new PublicBillResponse(
                b.getBillNo(),
                b.getStatus(),
                b.getDownline().getName(),
                b.getBrandPartner(),
                b.getItems().stream().map(BillResponse::toItem).toList(),
                b.getTotalPoints(),
                b.getPreviousMonthPoints(),
                b.getMonthPointsTotal(),
                b.getTotalAmount(),
                b.getPreviousBalance(),
                b.getAmountPaid(),
                b.getPreviousBalance().add(b.getBalance()),
                b.getIssuedAt()
        );
    }
}