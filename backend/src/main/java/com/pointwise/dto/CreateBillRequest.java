package com.pointwise.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record CreateBillRequest(
        @NotNull Long downlineId,
        String brandPartner,
        @NotEmpty @Valid List<BillItemRequest> items
) {}