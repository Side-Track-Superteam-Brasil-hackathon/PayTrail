package com.paytrail.market;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "access_logs")
public class AccessLog {

    public enum Action { VIEW_REPORT, EXPORT_CSV, VIEW_INVOICE }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "accountant_id", nullable = false, updatable = false)
    private UUID accountantId;

    @Column(name = "freelancer_id", nullable = false, updatable = false)
    private UUID freelancerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Action action;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected AccessLog() {}

    public AccessLog(UUID accountantId, UUID freelancerId, Action action) {
        this.accountantId = accountantId;
        this.freelancerId = freelancerId;
        this.action = action;
    }

    public UUID getId() { return id; }
    public UUID getAccountantId() { return accountantId; }
    public UUID getFreelancerId() { return freelancerId; }
    public Action getAction() { return action; }
    public Instant getCreatedAt() { return createdAt; }
}
