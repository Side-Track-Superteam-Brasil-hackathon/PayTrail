package com.paytrail.payment;

import com.paytrail.common.Enums.FxRule;
import com.paytrail.common.Enums.Network;
import com.paytrail.reconciliation.Reconciliation.MatchMethod;
import com.paytrail.reconciliation.Reconciliation.PaymentStatus;
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

/** Transferência de USDC detectada on-chain para a carteira de um freelancer. */
@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Network network;

    @Column(name = "tx_hash", nullable = false, updatable = false)
    private String txHash;

    @Column(name = "log_index", nullable = false, updatable = false)
    private int logIndex;

    @Column(name = "from_address", nullable = false, updatable = false)
    private String fromAddress;

    @Column(name = "to_address", nullable = false, updatable = false)
    private String toAddress;

    @Column(nullable = false, precision = 20, scale = 6, updatable = false)
    private BigDecimal amount;

    @Column(name = "block_time", nullable = false, updatable = false)
    private Instant blockTime;

    @Column(name = "freelancer_id", nullable = false, updatable = false)
    private UUID freelancerId;

    @Column(name = "invoice_id")
    private UUID invoiceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "match_method")
    private MatchMethod matchMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status = PaymentStatus.DETECTED;

    @Column(name = "unmatched_reason")
    private String unmatchedReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "fx_rule")
    private FxRule fxRule;

    @Column(name = "fx_date")
    private LocalDate fxDate;

    @Column(name = "fx_rate", precision = 12, scale = 6)
    private BigDecimal fxRate;

    @Column(name = "amount_brl", precision = 20, scale = 2)
    private BigDecimal amountBrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Payment() {}

    public Payment(Network network, String txHash, int logIndex, String fromAddress, String toAddress,
                   BigDecimal amount, Instant blockTime, UUID freelancerId) {
        this.network = network;
        this.txHash = txHash;
        this.logIndex = logIndex;
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.blockTime = blockTime;
        this.freelancerId = freelancerId;
    }

    public UUID getId() { return id; }
    public Network getNetwork() { return network; }
    public String getTxHash() { return txHash; }
    public int getLogIndex() { return logIndex; }
    public String getFromAddress() { return fromAddress; }
    public String getToAddress() { return toAddress; }
    public BigDecimal getAmount() { return amount; }
    public Instant getBlockTime() { return blockTime; }
    public UUID getFreelancerId() { return freelancerId; }
    public UUID getInvoiceId() { return invoiceId; }
    public MatchMethod getMatchMethod() { return matchMethod; }
    public PaymentStatus getStatus() { return status; }
    public String getUnmatchedReason() { return unmatchedReason; }
    public FxRule getFxRule() { return fxRule; }
    public LocalDate getFxDate() { return fxDate; }
    public BigDecimal getFxRate() { return fxRate; }
    public BigDecimal getAmountBrl() { return amountBrl; }
    public Instant getCreatedAt() { return createdAt; }

    public void setInvoiceId(UUID invoiceId) { this.invoiceId = invoiceId; }
    public void setMatchMethod(MatchMethod matchMethod) { this.matchMethod = matchMethod; }
    public void setStatus(PaymentStatus status) { this.status = status; }
    public void setUnmatchedReason(String unmatchedReason) { this.unmatchedReason = unmatchedReason; }
    public void setFxRule(FxRule fxRule) { this.fxRule = fxRule; }
    public void setFxDate(LocalDate fxDate) { this.fxDate = fxDate; }
    public void setFxRate(BigDecimal fxRate) { this.fxRate = fxRate; }
    public void setAmountBrl(BigDecimal amountBrl) { this.amountBrl = amountBrl; }
}
