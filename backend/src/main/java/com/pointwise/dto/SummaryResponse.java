package com.pointwise.dto;

import java.math.BigDecimal;

public record SummaryResponse(
        BigDecimal totalPending,     // still to collect
        BigDecimal totalReceived,    // collected so far
        long pendingCount,           // PENDING bills
        long partialCount,           // PARTIAL bills
        long paidCount,
        long draftCount
) {}