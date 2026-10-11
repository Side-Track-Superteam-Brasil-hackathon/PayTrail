package com.paytrail.reconciliation;

import com.paytrail.reconciliation.Reconciliation.ApplyResult;
import com.paytrail.reconciliation.Reconciliation.IncomingTransfer;
import com.paytrail.reconciliation.Reconciliation.InvoiceSnapshot;
import com.paytrail.reconciliation.Reconciliation.InvoiceStatus;
import com.paytrail.reconciliation.Reconciliation.MatchDecision;
import com.paytrail.reconciliation.Reconciliation.MatchMethod;
import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/** Regras de matching e de status (specs/02-conciliacao.md §2 e specs/01-dominio.md). */
public final class Matcher {

    private Matcher() {}

    /**
     * Decide a qual fatura um pagamento pertence.
     *
     * @param invoices faturas do freelancer dono do {@code toAddress} (qualquer status)
     */
    public static MatchDecision match(IncomingTransfer t, List<InvoiceSnapshot> invoices) {
        // 1. REFERENCE (Solana Pay)
        var byRef = invoices.stream()
                .filter(i -> i.network() == t.network() && i.reference() != null && t.references().contains(i.reference()))
                .findFirst();
        if (byRef.isPresent()) return explicit(byRef.get(), MatchMethod.REFERENCE);

        // 2. CONTRACT_EVENT (roadmap — Arc)
        if (t.contractInvoiceId() != null) {
            var byEvent = invoices.stream()
                    .filter(i -> i.network() == t.network() && Objects.equals(i.reference(), t.contractInvoiceId()))
                    .findFirst();
            if (byEvent.isPresent()) return explicit(byEvent.get(), MatchMethod.CONTRACT_EVENT);
        }

        // 3. UNIQUE_AMOUNT: valor único exato ou quitação exata do saldo de uma parcial
        var candidates = invoices.stream()
                .filter(i -> i.network() == t.network())
                .filter(i -> i.recipientAddress().equals(t.toAddress()))
                .filter(InvoiceSnapshot::isOpenForPayment)
                .filter(i -> sameAmount(t.amount(), i.uniqueAmount()) || sameAmount(t.amount(), i.balance()))
                .toList();
        return switch (candidates.size()) {
            case 0 -> MatchDecision.unmatched(Reconciliation.NO_CANDIDATE);
            case 1 -> MatchDecision.matched(candidates.get(0).id(), MatchMethod.UNIQUE_AMOUNT);
            default -> MatchDecision.ambiguous();
        };
    }

    /** Match manual pedido pelo freelancer; mesma regra de fatura cancelada. */
    public static Optional<String> canMatchManually(InvoiceSnapshot invoice) {
        return invoice.status() == InvoiceStatus.CANCELLED
                ? Optional.of(Reconciliation.INVOICE_CANCELLED)
                : Optional.empty();
    }

    /** Aplica um pagamento conciliado à fatura e recalcula o status. */
    public static ApplyResult apply(InvoiceSnapshot invoice, BigDecimal amount) {
        var paid = invoice.amountPaid().add(amount);
        var status = status(false, invoice.baseAmount(), invoice.uniqueAmount(), paid);
        var balance = invoice.uniqueAmount().subtract(paid).max(BigDecimal.ZERO);
        var excess = paid.subtract(invoice.uniqueAmount()).max(BigDecimal.ZERO);
        return new ApplyResult(paid, status, balance, excess);
    }

    /** Tabela de status de specs/01-dominio.md. */
    public static InvoiceStatus status(boolean cancelled, BigDecimal base, BigDecimal unique, BigDecimal paid) {
        if (cancelled) return InvoiceStatus.CANCELLED;
        if (paid.signum() == 0) return InvoiceStatus.OPEN;
        if (paid.compareTo(base) < 0) return InvoiceStatus.PARTIALLY_PAID;
        if (paid.compareTo(unique) <= 0) return InvoiceStatus.PAID;
        return InvoiceStatus.OVERPAID;
    }

    private static MatchDecision explicit(InvoiceSnapshot invoice, MatchMethod method) {
        return invoice.status() == InvoiceStatus.CANCELLED
                ? MatchDecision.unmatched(Reconciliation.INVOICE_CANCELLED)
                : MatchDecision.matched(invoice.id(), method);
    }

    private static boolean sameAmount(BigDecimal a, BigDecimal b) {
        return a.compareTo(b) == 0;
    }
}
