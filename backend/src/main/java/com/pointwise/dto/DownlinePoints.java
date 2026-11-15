package com.pointwise.dto;

import java.math.BigDecimal;

public record DownlinePoints(
        Long downlineId,
        String downlineName,
        BigDecimal points,
        int billCount,
        BigDecimal billed
) {}