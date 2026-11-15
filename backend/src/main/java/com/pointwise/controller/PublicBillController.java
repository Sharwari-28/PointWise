package com.pointwise.controller;

import com.pointwise.dto.PublicBillResponse;
import com.pointwise.service.BillService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/bills")
public class PublicBillController {

    private final BillService billService;

    public PublicBillController(BillService billService) {
        this.billService = billService;
    }

    @GetMapping("/{token}")
    public PublicBillResponse getByToken(@PathVariable String token) {
        return PublicBillResponse.from(billService.getByShareToken(token));
    }
}