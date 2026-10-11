package com.paytrail.receipt;

import com.paytrail.auth.CurrentUser;
import com.paytrail.common.ApiException;
import com.paytrail.common.Enums.Role;
import com.paytrail.config.PayTrailProperties;
import com.paytrail.invoice.InvoiceService;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Gerar comprovante (freelancer) e verificação pública (/verify). */
@RestController
public class ReceiptController {

    /** Schema Receipt de specs/03-api.yaml. */
    public record ReceiptDto(UUID id, UUID invoiceId, String sha256, String canonicalJson, String verifyUrl,
                             String anchorTx, Instant createdAt) {}

    public record VerifyResult(boolean valid, ReceiptDto receipt) {}

    public record VerifyJsonResult(String sha256, boolean valid) {}

    private final CurrentUser currentUser;
    private final InvoiceService invoices;
    private final ReceiptService receipts;
    private final String publicWebUrl;

    public ReceiptController(CurrentUser currentUser, InvoiceService invoices, ReceiptService receipts,
                             PayTrailProperties props) {
        this.currentUser = currentUser;
        this.invoices = invoices;
        this.receipts = receipts;
        var base = props.publicWebUrl() == null ? "" : props.publicWebUrl();
        this.publicWebUrl = base.replaceAll("/+$", "");
    }

    @PostMapping("/invoices/{id}/receipt")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ReceiptDto generate(@PathVariable UUID id) {
        var freelancer = currentUser.require(Role.FREELANCER);
        var invoice = invoices.getOwned(freelancer.getId(), id);
        return toDto(receipts.generate(invoice));
    }

    @GetMapping("/verify/{sha256}")
    @Transactional(readOnly = true)
    public VerifyResult verify(@PathVariable String sha256) {
        var receipt = receipts.findBySha256(sha256)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "no receipt with this hash"));
        return new VerifyResult(true, toDto(receipt));
    }

    /** Recalcula o hash de um JSON qualquer (canonicalizado) e diz se bate com algum comprovante. */
    @PostMapping("/verify")
    @Transactional(readOnly = true)
    public VerifyJsonResult verifyJson(@RequestBody(required = false) String body) {
        if (body == null || body.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_JSON", "request body must be a JSON document");
        }
        String canonical;
        try {
            canonical = CanonicalJson.canonicalize(body);
        } catch (IllegalArgumentException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_JSON", "request body must be a JSON document");
        }
        var sha = CanonicalJson.sha256Hex(canonical);
        return new VerifyJsonResult(sha, receipts.exists(sha));
    }

    private ReceiptDto toDto(Receipt r) {
        return new ReceiptDto(r.getId(), r.getInvoiceId(), r.getSha256(), r.getCanonicalJson(),
                publicWebUrl + "/verify/" + r.getSha256(), r.getAnchorTx(), r.getCreatedAt());
    }
}
