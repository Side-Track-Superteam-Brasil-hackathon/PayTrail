package com.paytrail.market;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "proposals")
public class Proposal {

    public enum Status { SENT, ACCEPTED, REJECTED, CANCELLED }

    public enum FeeCurrency { BRL, USDC }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "conversation_id", nullable = false, updatable = false)
    private UUID conversationId;

    @Column(name = "sender_id", nullable = false, updatable = false)
    private UUID senderId;

    @Column(name = "recipient_id", nullable = false, updatable = false)
    private UUID recipientId;

    @Column(name = "accountant_id", nullable = false, updatable = false)
    private UUID accountantId;

    @Column(name = "freelancer_id", nullable = false, updatable = false)
    private UUID freelancerId;

    @Column(name = "fee_amount", nullable = false, precision = 20, scale = 6, updatable = false)
    private BigDecimal feeAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "fee_currency", nullable = false, updatable = false)
    private FeeCurrency feeCurrency;

    @Column(name = "period_start", nullable = false, updatable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false, updatable = false)
    private LocalDate periodEnd;

    @Column(updatable = false)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.SENT;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "decided_at")
    private Instant decidedAt;

    protected Proposal() {}

    public Proposal(UUID conversationId, UUID senderId, UUID recipientId, UUID accountantId, UUID freelancerId,
                    BigDecimal feeAmount, FeeCurrency feeCurrency, LocalDate periodStart, LocalDate periodEnd,
                    String note) {
        this.conversationId = conversationId;
        this.senderId = senderId;
        this.recipientId = recipientId;
        this.accountantId = accountantId;
        this.freelancerId = freelancerId;
        this.feeAmount = feeAmount;
        this.feeCurrency = feeCurrency;
        this.periodStart = periodStart;
        this.periodEnd = periodEnd;
        this.note = note;
    }

    public UUID getId() { return id; }
    public UUID getConversationId() { return conversationId; }
    public UUID getSenderId() { return senderId; }
    public UUID getRecipientId() { return recipientId; }
    public UUID getAccountantId() { return accountantId; }
    public UUID getFreelancerId() { return freelancerId; }
    public BigDecimal getFeeAmount() { return feeAmount; }
    public FeeCurrency getFeeCurrency() { return feeCurrency; }
    public LocalDate getPeriodStart() { return periodStart; }
    public LocalDate getPeriodEnd() { return periodEnd; }
    public String getNote() { return note; }
    public Status getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getDecidedAt() { return decidedAt; }

    public void decide(Status status) {
        this.status = status;
        this.decidedAt = Instant.now();
    }
}
