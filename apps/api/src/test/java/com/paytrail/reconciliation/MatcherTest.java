package com.paytrail.reconciliation;

import static org.assertj.core.api.Assertions.assertThat;

import com.paytrail.common.Enums.Network;
import com.paytrail.reconciliation.Reconciliation.IncomingTransfer;
import com.paytrail.reconciliation.Reconciliation.InvoiceSnapshot;
import com.paytrail.reconciliation.Reconciliation.InvoiceStatus;
import com.paytrail.reconciliation.Reconciliation.MatchMethod;
import com.paytrail.reconciliation.Reconciliation.PaymentStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Casos da tabela de specs/02-conciliacao.md §6. O caso 10 (idempotência por txHash/logIndex)
 * é garantido pela constraint única em payments e deve ser coberto no teste do serviço.
 */
class MatcherTest {

    static final String W = "WalletAna111";
    static final String OTHER_WALLET = "WalletOther222";
    static final UUID A = UUID.randomUUID();
    static final UUID B = UUID.randomUUID();
    static final UUID C = UUID.randomUUID();

    static BigDecimal d(String v) {
        return new BigDecimal(v);
    }

    static InvoiceSnapshot invoiceA(String paid, InvoiceStatus status) {
        return new InvoiceSnapshot(A, Network.SOLANA, W, "RA", d("1500.00"), d("1500.17"), d(paid), status);
    }

    static InvoiceSnapshot invoiceB(String paid, InvoiceStatus status) {
        return new InvoiceSnapshot(B, Network.SOLANA, W, "RB", d("300.00"), d("300.42"), d(paid), status);
    }

    static IncomingTransfer transfer(String amount, String... refs) {
        return new IncomingTransfer(Network.SOLANA, W, d(amount), List.of(refs), null);
    }

    @Test
    void case01_referencePaysInFull() {
        var a = invoiceA("0", InvoiceStatus.OPEN);
        var m = Matcher.match(transfer("1500.17", "RA"), List.of(a));
        assertThat(m.status()).isEqualTo(PaymentStatus.MATCHED);
        assertThat(m.invoiceId()).isEqualTo(A);
        assertThat(m.method()).isEqualTo(MatchMethod.REFERENCE);
        assertThat(Matcher.apply(a, d("1500.17")).status()).isEqualTo(InvoiceStatus.PAID);
    }

    @Test
    void case02_uniqueAmountWithoutReference() {
        var a = invoiceA("0", InvoiceStatus.OPEN);
        var m = Matcher.match(transfer("1500.17"), List.of(a));
        assertThat(m.invoiceId()).isEqualTo(A);
        assertThat(m.method()).isEqualTo(MatchMethod.UNIQUE_AMOUNT);
        assertThat(Matcher.apply(a, d("1500.17")).status()).isEqualTo(InvoiceStatus.PAID);
    }

    @Test
    void case03_baseAmountWithReferenceCountsAsPaid() {
        var a = invoiceA("0", InvoiceStatus.OPEN);
        var m = Matcher.match(transfer("1500.00", "RA"), List.of(a));
        assertThat(m.method()).isEqualTo(MatchMethod.REFERENCE);
        assertThat(Matcher.apply(a, d("1500.00")).status()).isEqualTo(InvoiceStatus.PAID);
    }

    @Test
    void case04_partialPayment() {
        var a = invoiceA("0", InvoiceStatus.OPEN);
        var m = Matcher.match(transfer("700.00", "RA"), List.of(a));
        assertThat(m.invoiceId()).isEqualTo(A);
        var r = Matcher.apply(a, d("700.00"));
        assertThat(r.status()).isEqualTo(InvoiceStatus.PARTIALLY_PAID);
        assertThat(r.amountPaid()).isEqualByComparingTo("700");
        assertThat(r.balance()).isEqualByComparingTo("800.17");
    }

    @Test
    void case05_exactBalanceOfPartialWithoutReference() {
        var a = invoiceA("700.00", InvoiceStatus.PARTIALLY_PAID);
        var m = Matcher.match(transfer("800.17"), List.of(a));
        assertThat(m.invoiceId()).isEqualTo(A);
        assertThat(m.method()).isEqualTo(MatchMethod.UNIQUE_AMOUNT);
        assertThat(Matcher.apply(a, d("800.17")).status()).isEqualTo(InvoiceStatus.PAID);
    }

    @Test
    void case06_overpayment() {
        var a = invoiceA("0", InvoiceStatus.OPEN);
        var r = Matcher.apply(a, d("1600.00"));
        assertThat(Matcher.match(transfer("1600.00", "RA"), List.of(a)).invoiceId()).isEqualTo(A);
        assertThat(r.status()).isEqualTo(InvoiceStatus.OVERPAID);
        assertThat(r.excess()).isEqualByComparingTo("99.83");
    }

    @Test
    void case07_noCandidate() {
        var m = Matcher.match(transfer("312.50"),
                List.of(invoiceA("0", InvoiceStatus.OPEN), invoiceB("0", InvoiceStatus.OPEN)));
        assertThat(m.status()).isEqualTo(PaymentStatus.UNMATCHED);
        assertThat(m.reason()).isEqualTo(Reconciliation.NO_CANDIDATE);
        assertThat(m.invoiceId()).isNull();
    }

    @Test
    void case08_sameUniqueAmountOnAnotherWalletIsNotACandidate() {
        var c = new InvoiceSnapshot(C, Network.SOLANA, OTHER_WALLET, "RC", d("1500.00"), d("1500.17"), d("0"), InvoiceStatus.OPEN);
        var m = Matcher.match(transfer("1500.17"), List.of(invoiceA("0", InvoiceStatus.OPEN), c));
        assertThat(m.status()).isEqualTo(PaymentStatus.MATCHED);
        assertThat(m.invoiceId()).isEqualTo(A);
    }

    @Test
    void case08b_twoCandidatesOnSameWalletIsAmbiguous() {
        var a2 = new InvoiceSnapshot(C, Network.SOLANA, W, "RC", d("1500.00"), d("1500.17"), d("0"), InvoiceStatus.OPEN);
        var m = Matcher.match(transfer("1500.17"), List.of(invoiceA("0", InvoiceStatus.OPEN), a2));
        assertThat(m.status()).isEqualTo(PaymentStatus.AMBIGUOUS);
        assertThat(m.reason()).isEqualTo(Reconciliation.MULTIPLE_CANDIDATES);
    }

    @Test
    void case09_referenceToCancelledInvoice() {
        var m = Matcher.match(transfer("1500.17", "RA"), List.of(invoiceA("0", InvoiceStatus.CANCELLED)));
        assertThat(m.status()).isEqualTo(PaymentStatus.UNMATCHED);
        assertThat(m.reason()).isEqualTo(Reconciliation.INVOICE_CANCELLED);
    }

    @Test
    void case09b_cancelledInvoiceIsNotAUniqueAmountCandidate() {
        var m = Matcher.match(transfer("1500.17"), List.of(invoiceA("0", InvoiceStatus.CANCELLED)));
        assertThat(m.status()).isEqualTo(PaymentStatus.UNMATCHED);
        assertThat(m.reason()).isEqualTo(Reconciliation.NO_CANDIDATE);
    }

    @Test
    void case11_otherTokenIsIgnored() {
        assertThat(TransferFilter.isRelevant("OtherMint", "UsdcMint", W, Set.of(W))).isFalse();
        assertThat(TransferFilter.isRelevant("UsdcMint", "UsdcMint", "Stranger", Set.of(W))).isFalse();
        assertThat(TransferFilter.isRelevant("UsdcMint", "UsdcMint", W, Set.of(W))).isTrue();
    }

    @Test
    void case12_manualMatchThatOverpays() {
        var b = invoiceB("0", InvoiceStatus.OPEN);
        assertThat(Matcher.canMatchManually(b)).isEmpty();
        var r = Matcher.apply(b, d("312.50"));
        assertThat(r.status()).isEqualTo(InvoiceStatus.OVERPAID);
        assertThat(r.excess()).isEqualByComparingTo("12.08");
    }

    @Test
    void manualMatchOnCancelledInvoiceIsRejected() {
        assertThat(Matcher.canMatchManually(invoiceA("0", InvoiceStatus.CANCELLED)))
                .contains(Reconciliation.INVOICE_CANCELLED);
    }

    @Test
    void statusTable() {
        var base = d("100.00");
        var unique = d("100.37");
        assertThat(Matcher.status(false, base, unique, d("0"))).isEqualTo(InvoiceStatus.OPEN);
        assertThat(Matcher.status(false, base, unique, d("99.99"))).isEqualTo(InvoiceStatus.PARTIALLY_PAID);
        assertThat(Matcher.status(false, base, unique, d("100.00"))).isEqualTo(InvoiceStatus.PAID);
        assertThat(Matcher.status(false, base, unique, d("100.37"))).isEqualTo(InvoiceStatus.PAID);
        assertThat(Matcher.status(false, base, unique, d("100.38"))).isEqualTo(InvoiceStatus.OVERPAID);
        assertThat(Matcher.status(true, base, unique, d("0"))).isEqualTo(InvoiceStatus.CANCELLED);
    }
}
