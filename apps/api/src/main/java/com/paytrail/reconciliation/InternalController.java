package com.paytrail.reconciliation;

import com.paytrail.common.Enums.Network;
import com.paytrail.invoice.Invoice;
import com.paytrail.invoice.InvoiceRepository;
import com.paytrail.reconciliation.Reconciliation.InvoiceStatus;
import com.paytrail.reconciliation.ReconciliationService.DetectedTransfer;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Watcher → API (specs/04-onchain.md). Protegido pelo InternalSecretFilter (header X-Internal-Secret). */
@RestController
@RequestMapping("/internal")
public class InternalController {

    public record SolanaTargets(List<String> wallets, List<String> references) {}

    public record ArcTargets(List<String> wallets) {}

    public record WatchTargets(SolanaTargets solana, ArcTargets arc) {}

    private final ReconciliationService reconciliation;
    private final InvoiceRepository invoices;

    public InternalController(ReconciliationService reconciliation, InvoiceRepository invoices) {
        this.reconciliation = reconciliation;
        this.invoices = invoices;
    }

    @GetMapping("/watch-targets")
    @Transactional(readOnly = true)
    public WatchTargets watchTargets() {
        var references = invoices.findByNetworkAndStatusIn(Network.SOLANA,
                        EnumSet.of(InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID)).stream()
                .map(Invoice::getReference)
                .filter(Objects::nonNull)
                .toList();
        return new WatchTargets(new SolanaTargets(reconciliation.freelancerSolanaWallets(), references),
                new ArcTargets(List.of()));
    }

    @PostMapping("/transfers")
    public ResponseEntity<Void> transfers(@RequestBody List<DetectedTransfer> transfers) {
        reconciliation.processBatch(transfers == null ? List.of() : transfers);
        return ResponseEntity.accepted().build();
    }
}
