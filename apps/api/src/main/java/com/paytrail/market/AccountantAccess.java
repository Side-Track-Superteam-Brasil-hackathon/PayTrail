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
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.UUID;

/** Permissão do contador para ler o histórico do freelancer num período (concedida por proposta aceita). */
@Entity
@Table(name = "accountant_access")
public class AccountantAccess {

    public enum Status { ACTIVE, REVOKED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "accountant_id", nullable = false, updatable = false)
    private UUID accountantId;

    @Column(name = "freelancer_id", nullable = false, updatable = false)
    private UUID freelancerId;

    @Column(name = "proposal_id", nullable = false, updatable = false)
    private UUID proposalId;

    @Column(name = "period_start", nullable = false, updatable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false, updatable = false)
    private LocalDate periodEnd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.ACTIVE;

    @Column(name = "granted_at", nullable = false, updatable = false)
    private Instant grantedAt = Instant.now();

    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected AccountantAccess() {}

    public AccountantAccess(UUID accountantId, UUID freelancerId, UUID proposalId, LocalDate periodStart, LocalDate periodEnd) {
        this.accountantId = accountantId;
        this.freelancerId = freelancerId;
        this.proposalId = proposalId;
        this.periodStart = periodStart;
        this.periodEnd = periodEnd;
    }

    /** O mês inteiro precisa tocar o período concedido. */
    public boolean covers(YearMonth month) {
        return status == Status.ACTIVE
                && !month.atEndOfMonth().isBefore(periodStart)
                && !month.atDay(1).isAfter(periodEnd);
    }

    public void revoke() {
        this.status = Status.REVOKED;
        this.revokedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getAccountantId() { return accountantId; }
    public UUID getFreelancerId() { return freelancerId; }
    public UUID getProposalId() { return proposalId; }
    public LocalDate getPeriodStart() { return periodStart; }
    public LocalDate getPeriodEnd() { return periodEnd; }
    public Status getStatus() { return status; }
    public Instant getGrantedAt() { return grantedAt; }
    public Instant getRevokedAt() { return revokedAt; }
}
