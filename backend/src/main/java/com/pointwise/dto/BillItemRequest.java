package com.pointwise.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record BillItemRequest(
        @NotBlank String productName,
        @NotNull @PositiveOrZero BigDecimal points,   // points PER UNIT, entered manually
        @NotNull @Positive BigDecimal price,          // price PER UNIT
        @Positive int quantity
) {}