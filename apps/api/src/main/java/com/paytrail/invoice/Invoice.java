package com.paytrail.invoice;

import com.paytrail.common.Enums.Network;
import com.paytrail.reconciliation.Reconciliation.InvoiceSnapshot;
import com.paytrail.reconciliation.Reconciliation.InvoiceStatus;
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
@Table(name = "invoices")
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "public_id", nullable = false, unique = true, updatable = false)
    private String publicId;

    @Column(name = "freelancer_id", nullable = false, updatable = false)
    private UUID freelancerId;

    @Column(name = "client_name", nullable = false)
    private String clientName;

    @Column(name = "client_email")
    private String clientEmail;

    @Column(nullable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Network network;

    @Column(name = "recipient_address", nullable = false, updatable = false)
    private String recipientAddress;

    @Column(name = "base_amount", nullable = false, precision = 20, scale = 6)
    private BigDecimal baseAmount;

    @Column(name = "unique_amount", nullable = false, precision = 20, scale = 6)
    private BigDecimal uniqueAmount;

    @Column(unique = true)
    private String reference;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "amount_paid", nullable = false, precision = 20, scale = 6)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvoiceStatus status = InvoiceStatus.OPEN;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    protected Invoice() {}

    public Invoice(String publicId, UUID freelancerId, String clientName, String clientEmail, String description,
                   Network network, String recipientAddress, BigDecimal baseAmount, BigDecimal uniqueAmount,
                   String reference, LocalDate dueDate) {
        this.publicId = publicId;
        this.freelancerId = freelancerId;
        this.clientName = clientName;
        this.clientEmail = clientEmail;
        this.description = description;
        this.network = network;
        this.recipientAddress = recipientAddress;
        this.baseAmount = baseAmount;
        this.uniqueAmount = uniqueAmount;
        this.reference = reference;
        this.dueDate = dueDate;
    }

    public InvoiceSnapshot snapshot() {
        return new InvoiceSnapshot(id, network, recipientAddress, reference, baseAmount, uniqueAmount, amountPaid, status);
    }

    public BigDecimal balance() {
        return uniqueAmount.subtract(amountPaid).max(BigDecimal.ZERO);
    }

    public BigDecimal excess() {
        return amountPaid.subtract(uniqueAmount).max(BigDecimal.ZERO);
    }

    /** Flag derivado (não é estado): vencida e ainda aguardando pagamento. */
    public boolean isOverdue(LocalDate today) {
        return dueDate.isBefore(today) && (status == InvoiceStatus.OPEN || status == InvoiceStatus.PARTIALLY_PAID);
    }

    public UUID getId() { return id; }
    public String getPublicId() { return publicId; }
    public UUID getFreelancerId() { return freelancerId; }
    public String getClientName() { return clientName; }
    public String getClientEmail() { return clientEmail; }
    public String getDescription() { return description; }
    public Network getNetwork() { return network; }
    public String getRecipientAddress() { return recipientAddress; }
    public BigDecimal getBaseAmount() { return baseAmount; }
    public BigDecimal getUniqueAmount() { return uniqueAmount; }
    public String getReference() { return reference; }
    public LocalDate getDueDate() { return dueDate; }
    public BigDecimal getAmountPaid() { return amountPaid; }
    public InvoiceStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getCancelledAt() { return cancelledAt; }

    public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }
    public void setStatus(InvoiceStatus status) { this.status = status; }
    public void setCancelledAt(Instant cancelledAt) { this.cancelledAt = cancelledAt; }
}
