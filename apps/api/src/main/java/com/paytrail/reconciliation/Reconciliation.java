package com.paytrail.reconciliation;

import com.paytrail.common.Enums.Network;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Tipos do motor de conciliação (specs/02-conciliacao.md). Tudo aqui é imutável e sem I/O,
 * para que as regras sejam testadas isoladamente.
 */
public final class Reconciliation {

    private Reconciliation() {}

    public enum InvoiceStatus { OPEN, PARTIALLY_PAID, PAID, OVERPAID, CANCELLED }

    public enum PaymentStatus { DETECTED, MATCHED, UNMATCHED, AMBIGUOUS }

    public enum MatchMethod { REFERENCE, CONTRACT_EVENT, UNIQUE_AMOUNT, MANUAL }

    public static final String NO_CANDIDATE = "NO_CANDIDATE";
    public static final String MULTIPLE_CANDIDATES = "MULTIPLE_CANDIDATES";
    public static final String INVOICE_CANCELLED = "INVOICE_CANCELLED";

    /** O que o motor precisa saber de uma fatura. */
    public record InvoiceSnapshot(
            UUID id,
            Network network,
            String recipientAddress,
            String reference,
            BigDecimal baseAmount,
            BigDecimal uniqueAmount,
            BigDecimal amountPaid,
            InvoiceStatus status) {

        public boolean isOpenForPayment() {
            return status == InvoiceStatus.OPEN || status == InvoiceStatus.PARTIALLY_PAID;
        }

        public BigDecimal balance() {
            return uniqueAmount.subtract(amountPaid).max(BigDecimal.ZERO);
        }
    }

    /** Transferência de USDC já filtrada (token certo, destinatário conhecido). */
    public record IncomingTransfer(
            Network network,
            String toAddress,
            BigDecimal amount,
            List<String> references,
            String contractInvoiceId) {

        public IncomingTransfer {
            references = references == null ? List.of() : List.copyOf(references);
        }
    }

    /** Resultado do matching: MATCHED (com fatura e método), UNMATCHED ou AMBIGUOUS (com motivo). */
    public record MatchDecision(PaymentStatus status, UUID invoiceId, MatchMethod method, String reason) {

        static MatchDecision matched(UUID invoiceId, MatchMethod method) {
            return new MatchDecision(PaymentStatus.MATCHED, invoiceId, method, null);
        }

        static MatchDecision unmatched(String reason) {
            return new MatchDecision(PaymentStatus.UNMATCHED, null, null, reason);
        }

        static MatchDecision ambiguous() {
            return new MatchDecision(PaymentStatus.AMBIGUOUS, null, null, MULTIPLE_CANDIDATES);
        }
    }

    /** Novo estado da fatura depois de aplicar um pagamento. */
    public record ApplyResult(BigDecimal amountPaid, InvoiceStatus status, BigDecimal balance, BigDecimal excess) {}
}
