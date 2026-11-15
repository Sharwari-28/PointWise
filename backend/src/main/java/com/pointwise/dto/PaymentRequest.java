package com.pointwise.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record PaymentRequest(
        @NotNull @Positive BigDecimal amount,
        LocalDate paidOn,
        String note
) {}