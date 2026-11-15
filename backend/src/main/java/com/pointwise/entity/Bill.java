package com.pointwise.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bills")
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String billNo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "downline_id")
    private Downline downline;

    private String brandPartner;

    @Column(precision = 12, scale = 2)
    private BigDecimal totalPoints = BigDecimal.ZERO;

    @Column(precision = 12, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(precision = 12, scale = 2)
    private BigDecimal previousBalance = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BillStatus status = BillStatus.PENDING;

    @Column(nullable = false, unique = true, updatable = false)
    private String shareToken;
    
    @Column(precision = 12, scale = 2)
    private BigDecimal previousMonthPoints = BigDecimal.ZERO;

    private LocalDateTime createdAt;
    private LocalDateTime issuedAt;
    private LocalDateTime paidAt;

    @OneToMany(mappedBy = "bill", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BillItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "bill", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Payment> payments = new ArrayList<>();

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public void addItem(BillItem item) {
        items.add(item);
        item.setBill(this);
    }

    public BigDecimal getAmountPaid() {
        return payments.stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal getBalance() {
        return totalAmount.subtract(getAmountPaid());
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBillNo() { return billNo; }
    public void setBillNo(String billNo) { this.billNo = billNo; }

    public Downline getDownline() { return downline; }
    public void setDownline(Downline downline) { this.downline = downline; }

    public String getBrandPartner() { return brandPartner; }
    public void setBrandPartner(String brandPartner) { this.brandPartner = brandPartner; }

    public BigDecimal getTotalPoints() { return totalPoints; }
    public void setTotalPoints(BigDecimal totalPoints) { this.totalPoints = totalPoints; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getPreviousBalance() { return previousBalance; }
    public void setPreviousBalance(BigDecimal previousBalance) { this.previousBalance = previousBalance; }

    public BillStatus getStatus() { return status; }
    public void setStatus(BillStatus status) { this.status = status; }

    public String getShareToken() { return shareToken; }
    public void setShareToken(String shareToken) { this.shareToken = shareToken; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getIssuedAt() { return issuedAt; }
    public void setIssuedAt(LocalDateTime issuedAt) { this.issuedAt = issuedAt; }

    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }

    public List<BillItem> getItems() { return items; }
    public void setItems(List<BillItem> items) { this.items = items; }

    public List<Payment> getPayments() { return payments; }
    public void setPayments(List<Payment> payments) { this.payments = payments; }
    
    public BigDecimal getPreviousMonthPoints() {
        return previousMonthPoints == null ? BigDecimal.ZERO : previousMonthPoints;
    }
    public void setPreviousMonthPoints(BigDecimal previousMonthPoints) {
        this.previousMonthPoints = previousMonthPoints;
    }
    public BigDecimal getMonthPointsTotal() {
        return getPreviousMonthPoints().add(totalPoints);
    }
}