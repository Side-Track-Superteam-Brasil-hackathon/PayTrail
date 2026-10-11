package com.paytrail.payment;

import com.paytrail.auth.CurrentUser;
import com.paytrail.common.ApiException;
import com.paytrail.common.Enums.Role;
import com.paytrail.common.ExplorerLinks;
import com.paytrail.invoice.InvoiceRepository;
import com.paytrail.reconciliation.Matcher;
import com.paytrail.reconciliation.Reconciliation.MatchMethod;
import com.paytrail.reconciliation.Reconciliation.PaymentStatus;
import com.paytrail.reconciliation.ReconciliationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    public record MatchRequest(@NotNull UUID invoiceId) {}

    private final CurrentUser currentUser;
    private final PaymentRepository payments;
    private final InvoiceRepository invoices;
    private final ReconciliationService reconciliation;
    private final ExplorerLinks links;

    public PaymentController(CurrentUser currentUser, PaymentRepository payments, InvoiceRepository invoices,
                             ReconciliationService reconciliation, ExplorerLinks links) {
        this.currentUser = currentUser;
        this.payments = payments;
        this.invoices = invoices;
        this.reconciliation = reconciliation;
        this.links = links;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<PaymentDto> list(@RequestParam(required = false) PaymentStatus status) {
        var freelancer = currentUser.require(Role.FREELANCER);
        var list = status == null
                ? payments.findByFreelancerIdOrderByBlockTimeDesc(freelancer.getId())
                : payments.findByFreelancerIdAndStatusOrderByBlockTimeDesc(freelancer.getId(), status);
        return list.stream().map(p -> PaymentDto.of(p, links)).toList();
    }

    /** Match manual (specs/02 §2): só UNMATCHED/AMBIGUOUS do próprio freelancer, para fatura própria não cancelada. */
    @PostMapping("/{id}/match")
    @Transactional
    public PaymentDto match(@PathVariable UUID id, @Valid @RequestBody MatchRequest req) {
        var freelancer = currentUser.require(Role.FREELANCER);
        invoices.lockFreelancer(freelancer.getId());
        var payment = payments.findById(id)
                .filter(p -> p.getFreelancerId().equals(freelancer.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "payment not found"));
        if (payment.getStatus() != PaymentStatus.UNMATCHED && payment.getStatus() != PaymentStatus.AMBIGUOUS) {
            throw new ApiException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_MATCHED", "payment is already matched");
        }
        var invoice = invoices.findById(req.invoiceId())
                .filter(i -> i.getFreelancerId().equals(freelancer.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "invoice not found"));
        Matcher.canMatchManually(invoice.snapshot()).ifPresent(reason -> {
            throw new ApiException(HttpStatus.CONFLICT, reason, "invoice is cancelled");
        });
        reconciliation.applyMatch(payment, invoice, MatchMethod.MANUAL, freelancer);
        return PaymentDto.of(payment, links);
    }
}
