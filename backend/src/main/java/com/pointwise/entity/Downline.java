package com.pointwise.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "downlines")
public class Downline {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String consultantId;

    @NotBlank(message = "Name is required")
    @Column(nullable = false)
    private String name;

    private String phone;

    private String brandPartner;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getConsultantId() { return consultantId; }
    public void setConsultantId(String consultantId) { this.consultantId = consultantId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getBrandPartner() { return brandPartner; }
    public void setBrandPartner(String brandPartner) { this.brandPartner = brandPartner; }
}