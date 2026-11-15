package com.pointwise.dto;

import java.math.BigDecimal;

public record MonthlyRow(
        String month,          // e.g. "2026-11"
        int billCount,
        int paidBillCount,
        BigDecimal opening,    // carried forward from earlier months
        BigDecimal billed,
        BigDecimal points,
        BigDecimal received,
        BigDecimal closing
) {}
