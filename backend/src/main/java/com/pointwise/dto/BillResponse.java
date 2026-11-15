package com.pointwise.dto;

import com.pointwise.entity.Bill;
import com.pointwise.entity.BillItem;
import com.pointwise.entity.BillStatus;
import com.pointwise.entity.Payment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record BillResponse(
        Long id,
        String billNo,
        BillStatus status,
        Long downlineId,
        String downlineName,
        String consultantId,
        String brandPartner,
        BigDecimal totalPoints,
        BigDecimal previousMonthPoints,
        BigDecimal monthPointsTotal,
        BigDecimal totalAmount,
        BigDecimal previousBalance,
        BigDecimal amountPaid,
        BigDecimal balance,
        BigDecimal amountDue,
        String shareToken,
        LocalDateTime createdAt,
        LocalDateTime issuedAt,
        LocalDateTime paidAt,
        List<ItemResponse> items,
        List<PaymentResponse> payments
) {

    public record ItemResponse(
            String productName,
            BigDecimal points,
            BigDecimal price,
            int quantity,
            BigDecimal linePoints,
            BigDecimal lineAmount
    ) {}

    public record PaymentResponse(
            Long id,
            BigDecimal amount,
            LocalDate paidOn,
            String note
    ) {}

    public static BillResponse from(Bill b) {
        List<ItemResponse> items = b.getItems().stream().map(BillResponse::toItem).toList();
        List<PaymentResponse> payments = b.getPayments().stream().map(BillResponse::toPayment).toList();

        return new BillResponse(
                b.getId(),
                b.getBillNo(),
                b.getStatus(),
                b.getDownline().getId(),
                b.getDownline().getName(),
                b.getDownline().getConsultantId(),
                b.getBrandPartner(),
                b.getTotalPoints(),
                b.getPreviousMonthPoints(),
                b.getMonthPointsTotal(),
                b.getTotalAmount(),
                b.getPreviousBalance(),
                b.getAmountPaid(),
                b.getBalance(),
                b.getPreviousBalance().add(b.getBalance()),
                b.getShareToken(),
                b.getCreatedAt(),
                b.getIssuedAt(),
                b.getPaidAt(),
                items,
                payments
        );
    }

    static ItemResponse toItem(BillItem i) {
        BigDecimal qty = BigDecimal.valueOf(i.getQuantity());
        return new ItemResponse(
                i.getProductName(),
                i.getPoints(),
                i.getPrice(),
                i.getQuantity(),
                i.getPoints().multiply(qty),
                i.getPrice().multiply(qty)
        );
    }

    static PaymentResponse toPayment(Payment p) {
        return new PaymentResponse(p.getId(), p.getAmount(), p.getPaidOn(), p.getNote());
    }
}