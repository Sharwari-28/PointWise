package com.pointwise.controller;

import com.pointwise.entity.Downline;
import com.pointwise.repository.BillRepository;
import com.pointwise.repository.DownlineRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/downlines")
public class DownlineController {

    private final DownlineRepository downlineRepository;
    private final BillRepository billRepository;

    public DownlineController(DownlineRepository downlineRepository,
                              BillRepository billRepository) {
        this.downlineRepository = downlineRepository;
        this.billRepository = billRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Downline create(@Valid @RequestBody Downline downline) {
        downline.setId(null);
        downline.setConsultantId(clean(downline.getConsultantId()));
        checkDuplicate(downline.getConsultantId(), null);
        return downlineRepository.save(downline);
    }

    @GetMapping
    public List<Downline> getAll() {
        return downlineRepository.findAll();
    }

    @GetMapping("/{id}")
    public Downline getOne(@PathVariable Long id) {
        return downlineRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Downline not found"));
    }

    @PutMapping("/{id}")
    public Downline update(@PathVariable Long id, @Valid @RequestBody Downline updated) {
        Downline existing = getOne(id);
        String consultantId = clean(updated.getConsultantId());
        checkDuplicate(consultantId, id);

        existing.setConsultantId(consultantId);
        existing.setName(updated.getName());
        existing.setPhone(updated.getPhone());
        existing.setBrandPartner(updated.getBrandPartner());
        return downlineRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Downline existing = getOne(id);
        if (billRepository.existsByDownlineId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This downline has bills or drafts, so it cannot be deleted. Use Edit to fix the details.");
        }
        downlineRepository.delete(existing);
        return ResponseEntity.noContent().build();
    }

    // blank text becomes null so two empty IDs are never treated as duplicates
    private String clean(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void checkDuplicate(String consultantId, Long selfId) {
        if (consultantId == null) return;
        downlineRepository.findByConsultantId(consultantId).ifPresent(other -> {
            if (selfId == null || !other.getId().equals(selfId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Consultant ID " + consultantId + " already belongs to " + other.getName());
            }
        });
    }
}