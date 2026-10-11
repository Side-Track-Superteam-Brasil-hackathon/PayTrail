package com.paytrail.invoice;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Trilha de auditoria da fatura (o "trail"). Tipos em specs/01-dominio.md. */
@Entity
@Table(name = "invoice_events")
public class InvoiceEvent {

    public static final String CREATED = "CREATED";
    public static final String PAYMENT_MATCHED = "PAYMENT_MATCHED";
    public static final String STATUS_CHANGED = "STATUS_CHANGED";
    public static final String CANCELLED = "CANCELLED";
    public static final String RECEIPT_GENERATED = "RECEIPT_GENERATED";
    public static final String RECEIPT_ANCHORED = "RECEIPT_ANCHORED";
    public static final String MANUAL_MATCH = "MANUAL_MATCH";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "invoice_id", nullable = false, updatable = false)
    private UUID invoiceId;

    @Column(nullable = false, updatable = false)
    private String type;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> payload;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected InvoiceEvent() {}

    public InvoiceEvent(UUID invoiceId, String type, Map<String, Object> payload) {
        this.invoiceId = invoiceId;
        this.type = type;
        this.payload = payload == null ? Map.of() : payload;
    }

    public UUID getId() { return id; }
    public UUID getInvoiceId() { return invoiceId; }
    public String getType() { return type; }
    public Map<String, Object> getPayload() { return payload; }
    public Instant getCreatedAt() { return createdAt; }
}
