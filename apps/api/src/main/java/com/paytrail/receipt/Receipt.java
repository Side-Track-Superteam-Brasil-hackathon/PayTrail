package com.paytrail.receipt;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "receipts")
public class Receipt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "invoice_id", nullable = false, updatable = false)
    private UUID invoiceId;

    @Column(name = "canonical_json", nullable = false, updatable = false)
    private String canonicalJson;

    @Column(nullable = false, unique = true, updatable = false)
    private String sha256;

    @Column(name = "anchor_network")
    private String anchorNetwork;

    @Column(name = "anchor_tx")
    private String anchorTx;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Receipt() {}

    public Receipt(UUID invoiceId, String canonicalJson, String sha256) {
        this.invoiceId = invoiceId;
        this.canonicalJson = canonicalJson;
        this.sha256 = sha256;
    }

    public UUID getId() { return id; }
    public UUID getInvoiceId() { return invoiceId; }
    public String getCanonicalJson() { return canonicalJson; }
    public String getSha256() { return sha256; }
    public String getAnchorNetwork() { return anchorNetwork; }
    public String getAnchorTx() { return anchorTx; }
    public Instant getCreatedAt() { return createdAt; }

    public void setAnchorNetwork(String anchorNetwork) { this.anchorNetwork = anchorNetwork; }
    public void setAnchorTx(String anchorTx) { this.anchorTx = anchorTx; }
}
