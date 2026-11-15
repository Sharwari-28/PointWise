package com.pointwise.controller;


import com.pointwise.dto.MonthlyRow;
import com.pointwise.dto.DownlinePoints;
import com.pointwise.dto.SummaryResponse;
import org.springframework.http.ResponseEntity;
import com.pointwise.dto.BillResponse;
import com.pointwise.dto.CreateBillRequest;
import com.pointwise.dto.PaymentRequest;
import com.pointwise.entity.BillStatus;
import com.pointwise.service.BillService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bills")
public class BillController {

    private final BillService billService;

    public BillController(BillService billService) {
        this.billService = billService;
    }

    @PostMapping("/draft")
    @ResponseStatus(HttpStatus.CREATED)
    public BillResponse createDraft(@Valid @RequestBody CreateBillRequest req) {
        return BillResponse.from(billService.createDraft(req));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BillResponse createBill(@Valid @RequestBody CreateBillRequest req) {
        return BillResponse.from(billService.createBill(req));
    }

    @PostMapping("/{id}/convert")
    public BillResponse convert(@PathVariable Long id) {
        return BillResponse.from(billService.convertDraftToBill(id));
    }

    @PostMapping("/{id}/payments")
    public BillResponse addPayment(@PathVariable Long id, @Valid @RequestBody PaymentRequest req) {
        return BillResponse.from(billService.addPayment(id, req));
    }

    @GetMapping
    public List<BillResponse> getBills(@RequestParam(required = false) BillStatus status) {
        return billService.getBills(status).stream().map(BillResponse::from).toList();
    }
    
    @GetMapping("/report")
    public List<MonthlyRow> report(@RequestParam int year) {
        return billService.getMonthlyReport(year);
    }
    @GetMapping("/points")
    public List<DownlinePoints> pointsByDownline(@RequestParam String month) {
        return billService.getPointsByDownline(month);
    }
    
    @GetMapping("/{id}")
    public BillResponse getOne(@PathVariable Long id) {
        return BillResponse.from(billService.getBill(id));
    }
    @GetMapping("/summary")
    public SummaryResponse getSummary() {
        return billService.getSummary();
    }
    @PutMapping("/{id}/draft")
    public BillResponse updateDraft(@PathVariable Long id, @Valid @RequestBody CreateBillRequest req) {
        return BillResponse.from(billService.updateDraft(id, req));
    }

    @DeleteMapping("/{id}/draft")
    public ResponseEntity<Void> deleteDraft(@PathVariable Long id) {
        billService.deleteDraft(id);
        return ResponseEntity.noContent().build();
    }
}