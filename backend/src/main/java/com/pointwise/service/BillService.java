package com.pointwise.service;

import com.pointwise.dto.BillItemRequest;
import com.pointwise.dto.CreateBillRequest;
import com.pointwise.dto.DownlinePoints;
import com.pointwise.dto.MonthlyRow;
import com.pointwise.dto.PaymentRequest;
import com.pointwise.dto.SummaryResponse;
import com.pointwise.entity.Bill;
import com.pointwise.entity.BillItem;
import com.pointwise.entity.BillStatus;
import com.pointwise.entity.Downline;
import com.pointwise.entity.Payment;
import com.pointwise.repository.BillRepository;
import com.pointwise.repository.DownlineRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class BillService {

    private final BillRepository billRepository;
    private final DownlineRepository downlineRepository;

    public BillService(BillRepository billRepository, DownlineRepository downlineRepository) {
        this.billRepository = billRepository;
        this.downlineRepository = downlineRepository;
    }

    // ---------- Draft (estimate) ----------
    @Transactional
    public Bill createDraft(CreateBillRequest req) {
        Bill bill = buildBill(req);
        bill.setStatus(BillStatus.DRAFT);
        bill.setPreviousMonthPoints(pointsEarlierThisMonth(bill, LocalDateTime.now()));
        return billRepository.save(bill);
    }

    @Transactional
    public Bill updateDraft(Long id, CreateBillRequest req) {
        Bill bill = getBill(id);
        if (bill.getStatus() != BillStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only a draft can be edited");
        }
        bill.getItems().clear();
        for (BillItemRequest r : req.items()) {
            BillItem item = new BillItem();
            item.setProductName(r.productName());
            item.setPoints(r.points());
            item.setPrice(r.price());
            item.setQuantity(r.quantity());
            bill.addItem(item);
        }
        if (req.brandPartner() != null) {
            bill.setBrandPartner(req.brandPartner());
        }
        calculateTotals(bill);
        bill.setPreviousMonthPoints(pointsEarlierThisMonth(bill, LocalDateTime.now()));
        return billRepository.save(bill);
    }

    @Transactional
    public void deleteDraft(Long id) {
        Bill bill = getBill(id);
        if (bill.getStatus() != BillStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only a draft can be deleted");
        }
        billRepository.delete(bill);
    }

    // ---------- Issue a real bill directly ----------
    @Transactional
    public Bill createBill(CreateBillRequest req) {
        Bill bill = buildBill(req);
        return issue(bill);
    }

    // ---------- Convert draft -> bill ----------
    @Transactional
    public Bill convertDraftToBill(Long id) {
        Bill bill = getBill(id);
        if (bill.getStatus() != BillStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only a draft can be converted");
        }
        return issue(bill);
    }

    // ---------- Record a manual payment ----------
    @Transactional
    public Bill addPayment(Long billId, PaymentRequest req) {
        Bill bill = getBill(billId);

        if (bill.getStatus() == BillStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot pay a draft");
        }
        if (req.amount().compareTo(bill.getBalance()) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Payment is more than the remaining balance of " + bill.getBalance());
        }

        Payment payment = new Payment();
        payment.setBill(bill);
        payment.setAmount(req.amount());
        payment.setPaidOn(req.paidOn() != null ? req.paidOn() : LocalDate.now());
        payment.setNote(req.note());
        bill.getPayments().add(payment);

        refreshStatus(bill);
        return billRepository.save(bill);
    }

    // ---------- Reads ----------
    @Transactional(readOnly = true)
    public List<Bill> getBills(BillStatus status) {
        return status == null ? billRepository.findAll() : billRepository.findByStatus(status);
    }

    @Transactional(readOnly = true)
    public Bill getBill(Long id) {
        return billRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Bill not found"));
    }

    @Transactional(readOnly = true)
    public Bill getByShareToken(String token) {
        return billRepository.findByShareToken(token).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Bill not found"));
    }

    @Transactional(readOnly = true)
    public SummaryResponse getSummary() {
        List<Bill> all = billRepository.findAll();

        BigDecimal pending = BigDecimal.ZERO;
        BigDecimal received = BigDecimal.ZERO;
        long pendingCount = 0, partialCount = 0, paidCount = 0, draftCount = 0;

        for (Bill b : all) {
            switch (b.getStatus()) {
                case DRAFT -> draftCount++;
                case PENDING -> { pendingCount++; pending = pending.add(b.getBalance()); }
                case PARTIAL -> { partialCount++; pending = pending.add(b.getBalance()); }
                case PAID -> paidCount++;
            }
            if (b.getStatus() != BillStatus.DRAFT) {
                received = received.add(b.getAmountPaid());
            }
        }
        return new SummaryResponse(pending, received, pendingCount, partialCount, paidCount, draftCount);
    }

    // ---------- Month-wise report (money carries forward) ----------
    @Transactional(readOnly = true)
    public List<MonthlyRow> getMonthlyReport(int year) {
        List<Bill> issued = billRepository.findAll().stream()
                .filter(b -> b.getStatus() != BillStatus.DRAFT && b.getIssuedAt() != null)
                .toList();

        // balance carried into January of this year
        LocalDate yearStart = LocalDate.of(year, 1, 1);
        BigDecimal opening = BigDecimal.ZERO;
        for (Bill b : issued) {
            if (b.getIssuedAt().toLocalDate().isBefore(yearStart)) {
                opening = opening.add(b.getTotalAmount());
            }
            for (Payment p : b.getPayments()) {
                if (p.getPaidOn() != null && p.getPaidOn().isBefore(yearStart)) {
                    opening = opening.subtract(p.getAmount());
                }
            }
        }

        List<MonthlyRow> rows = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            YearMonth ym = YearMonth.of(year, m);
            BigDecimal billed = BigDecimal.ZERO;
            BigDecimal points = BigDecimal.ZERO;
            BigDecimal received = BigDecimal.ZERO;
            int billCount = 0;
            int paidCount = 0;

            for (Bill b : issued) {
                if (YearMonth.from(b.getIssuedAt()).equals(ym)) {
                    billCount++;
                    billed = billed.add(b.getTotalAmount());
                    points = points.add(b.getTotalPoints());
                }
                if (b.getStatus() == BillStatus.PAID && b.getPaidAt() != null
                        && YearMonth.from(b.getPaidAt()).equals(ym)) {
                    paidCount++;
                }
                for (Payment p : b.getPayments()) {
                    if (p.getPaidOn() != null && YearMonth.from(p.getPaidOn()).equals(ym)) {
                        received = received.add(p.getAmount());
                    }
                }
            }

            BigDecimal closing = opening.add(billed).subtract(received);
            rows.add(new MonthlyRow(ym.toString(), billCount, paidCount,
                    opening, billed, points, received, closing));
            opening = closing;   // carry forward
        }
        return rows;
    }

    // ---------- Points per downline for one month (resets every month) ----------
    @Transactional(readOnly = true)
    public List<DownlinePoints> getPointsByDownline(String month) {
        YearMonth ym = YearMonth.parse(month);
        Map<Long, DownlinePoints> map = new LinkedHashMap<>();

        for (Bill b : billRepository.findAll()) {
            if (b.getStatus() == BillStatus.DRAFT || b.getIssuedAt() == null
                    || !YearMonth.from(b.getIssuedAt()).equals(ym)) {
                continue;
            }
            Downline d = b.getDownline();
            DownlinePoints cur = map.get(d.getId());
            if (cur == null) {
                cur = new DownlinePoints(d.getId(), d.getName(), BigDecimal.ZERO, 0, BigDecimal.ZERO);
            }
            map.put(d.getId(), new DownlinePoints(d.getId(), d.getName(),
                    cur.points().add(b.getTotalPoints()),
                    cur.billCount() + 1,
                    cur.billed().add(b.getTotalAmount())));
        }
        return map.values().stream()
                .sorted((a, c) -> c.points().compareTo(a.points()))
                .toList();
    }

    // ---------- Helpers ----------
    private Bill buildBill(CreateBillRequest req) {
        Downline downline = downlineRepository.findById(req.downlineId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Downline not found"));

        Bill bill = new Bill();
        bill.setDownline(downline);
        bill.setBrandPartner(req.brandPartner() != null && !req.brandPartner().isBlank()
                ? req.brandPartner() : downline.getBrandPartner());
        bill.setShareToken(UUID.randomUUID().toString().replace("-", ""));

        for (BillItemRequest r : req.items()) {
            BillItem item = new BillItem();
            item.setProductName(r.productName());
            item.setPoints(r.points());
            item.setPrice(r.price());
            item.setQuantity(r.quantity());
            bill.addItem(item);
        }
        calculateTotals(bill);
        return bill;
    }

    private Bill issue(Bill bill) {
        // money still owed by this downline from earlier bills
        BigDecimal previous = billRepository
                .findByDownlineIdAndStatusIn(bill.getDownline().getId(),
                        List.of(BillStatus.PENDING, BillStatus.PARTIAL))
                .stream()
                .filter(b -> bill.getId() == null || !b.getId().equals(bill.getId()))
                .map(Bill::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        LocalDateTime now = LocalDateTime.now();
        bill.setPreviousBalance(previous);
        bill.setPreviousMonthPoints(pointsEarlierThisMonth(bill, now));
        bill.setStatus(BillStatus.PENDING);
        bill.setIssuedAt(now);

        Bill saved = billRepository.save(bill);
        saved.setBillNo(String.format("PW-%04d", saved.getId()));
        return billRepository.save(saved);
    }

    // points this downline already earned earlier in the same calendar month
    private BigDecimal pointsEarlierThisMonth(Bill bill, LocalDateTime reference) {
        YearMonth ym = YearMonth.from(reference);
        LocalDateTime from = ym.atDay(1).atStartOfDay();
        LocalDateTime to = ym.plusMonths(1).atDay(1).atStartOfDay();

        return billRepository
                .findByDownlineIdAndIssuedAtBetween(bill.getDownline().getId(), from, to)
                .stream()
                .filter(b -> b.getStatus() != BillStatus.DRAFT)
                .filter(b -> bill.getId() == null || !b.getId().equals(bill.getId()))
                .filter(b -> b.getIssuedAt().isBefore(reference))
                .map(Bill::getTotalPoints)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void calculateTotals(Bill bill) {
        BigDecimal points = BigDecimal.ZERO;
        BigDecimal amount = BigDecimal.ZERO;
        for (BillItem i : bill.getItems()) {
            BigDecimal qty = BigDecimal.valueOf(i.getQuantity());
            points = points.add(i.getPoints().multiply(qty));
            amount = amount.add(i.getPrice().multiply(qty));
        }
        bill.setTotalPoints(points);
        bill.setTotalAmount(amount);
    }

    private void refreshStatus(Bill bill) {
        BigDecimal paid = bill.getAmountPaid();
        if (paid.compareTo(bill.getTotalAmount()) >= 0) {
            bill.setStatus(BillStatus.PAID);
            bill.setPaidAt(LocalDateTime.now());
        } else if (paid.compareTo(BigDecimal.ZERO) > 0) {
            bill.setStatus(BillStatus.PARTIAL);
            bill.setPaidAt(null);
        } else {
            bill.setStatus(BillStatus.PENDING);
            bill.setPaidAt(null);
        }
    }
}