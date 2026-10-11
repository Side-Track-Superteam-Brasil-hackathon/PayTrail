package com.paytrail.reconciliation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.paytrail.CoreApiTest;
import com.paytrail.fx.ExchangeRateRepository;
import com.paytrail.payment.PaymentRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

/** Casos de specs/02-conciliacao.md §6 de ponta a ponta via POST /internal/transfers. */
class ReconciliationIntegrationTest extends CoreApiTest {

    @Autowired
    PaymentRepository payments;

    @Autowired
    ExchangeRateRepository rates;

    @Autowired
    JdbcTemplate jdbc;

    Account f;
    JsonNode a;
    JsonNode b;
    String ra;

    @BeforeEach
    void setUp() throws Exception {
        f = freelancer("f@test.dev");
        a = createInvoice(f, "1500.00");
        b = createInvoice(f, "300.00");
        ra = referenceOf(a);
    }

    private JsonNode reload(JsonNode inv) throws Exception {
        return invoice(f, inv.get("id").asText());
    }

    private String uniqueA() {
        return a.get("uniqueAmount").asText();
    }

    private static List<String> eventTypes(JsonNode detail) {
        var types = new ArrayList<String>();
        detail.get("events").forEach(e -> types.add(e.get("type").asText()));
        return types;
    }

    @Test
    void case1_referenceMatchWithBrl() throws Exception {
        var tx = sig();
        send(transfer(tx, f.wallet(), uniqueA(), ra));
        var detail = reload(a);
        assertThat(detail.get("status").asText()).isEqualTo("PAID");
        assertThat(detail.get("amountPaid").asText()).isEqualTo(uniqueA());
        assertThat(detail.get("balance").asText()).isEqualTo("0.00");
        assertThat(eventTypes(detail)).containsExactly("CREATED", "PAYMENT_MATCHED", "STATUS_CHANGED");
        var statusEvent = detail.get("events").get(2).get("payload");
        assertThat(statusEvent.get("from").asText()).isEqualTo("OPEN");
        assertThat(statusEvent.get("to").asText()).isEqualTo("PAID");

        var p = detail.get("payments").get(0);
        assertThat(p.get("txHash").asText()).isEqualTo(tx);
        assertThat(p.get("status").asText()).isEqualTo("MATCHED");
        assertThat(p.get("matchMethod").asText()).isEqualTo("REFERENCE");
        assertThat(p.get("invoiceId").asText()).isEqualTo(a.get("id").asText());
        assertThat(p.get("explorerUrl").asText()).isEqualTo("https://explorer.solana.com/tx/" + tx + "?cluster=devnet");
        // CARNE_LEAO, recebido 14/10/2026 → cotação de compra de 15/09/2026
        assertThat(p.get("fxRule").asText()).isEqualTo("CARNE_LEAO");
        assertThat(p.get("fxDate").asText()).isEqualTo("2026-09-15");
        assertThat(p.get("fxRate").asText()).isEqualTo("5.0000");
        assertThat(p.get("amountBrl").asText())
                .isEqualTo(dec(a.get("uniqueAmount")).multiply(RATE).setScale(2, RoundingMode.HALF_UP).toPlainString());
        assertThat(rates.findById(LocalDate.of(2026, 9, 15))).isPresent();
        // a fatura paga sai dos watch-targets
        assertThat(invoiceRepository.findById(UUID.fromString(a.get("id").asText())).orElseThrow().getStatus())
                .isEqualTo(Reconciliation.InvoiceStatus.PAID);
    }

    @Test
    void case2_uniqueAmountWithoutReference() throws Exception {
        send(transfer(sig(), f.wallet(), uniqueA()));
        var detail = reload(a);
        assertThat(detail.get("status").asText()).isEqualTo("PAID");
        assertThat(detail.get("payments").get(0).get("matchMethod").asText()).isEqualTo("UNIQUE_AMOUNT");
        assertThat(reload(b).get("status").asText()).isEqualTo("OPEN");
    }

    @Test
    void case3_baseAmountByReferenceIsPaid() throws Exception {
        send(transfer(sig(), f.wallet(), "1500.00", ra));
        var detail = reload(a);
        assertThat(detail.get("status").asText()).isEqualTo("PAID");
        assertThat(detail.get("payments").get(0).get("matchMethod").asText()).isEqualTo("REFERENCE");
    }

    @Test
    void case4and5_partialThenExactBalance() throws Exception {
        send(transfer(sig(), f.wallet(), "700.00", ra));
        var detail = reload(a);
        assertThat(detail.get("status").asText()).isEqualTo("PARTIALLY_PAID");
        assertThat(detail.get("amountPaid").asText()).isEqualTo("700.00");
        assertThat(dec(detail.get("balance"))).isEqualByComparingTo(dec(a.get("uniqueAmount")).subtract(new BigDecimal("700")));

        var rest = dec(a.get("uniqueAmount")).subtract(new BigDecimal("700")).toPlainString();
        send(transfer(sig(), f.wallet(), rest));
        detail = reload(a);
        assertThat(detail.get("status").asText()).isEqualTo("PAID");
        assertThat(detail.get("amountPaid").asText()).isEqualTo(uniqueA());
        assertThat(detail.get("payments")).hasSize(2);
        assertThat(detail.get("payments").get(1).get("matchMethod").asText()).isEqualTo("UNIQUE_AMOUNT");
        assertThat(eventTypes(detail)).containsExactly(
                "CREATED", "PAYMENT_MATCHED", "STATUS_CHANGED", "PAYMENT_MATCHED", "STATUS_CHANGED");
    }

    @Test
    void case6_overpaid() throws Exception {
        send(transfer(sig(), f.wallet(), "1600.00", ra));
        var detail = reload(a);
        assertThat(detail.get("status").asText()).isEqualTo("OVERPAID");
        assertThat(dec(detail.get("excess"))).isEqualByComparingTo(new BigDecimal("1600").subtract(dec(a.get("uniqueAmount"))));
        assertThat(detail.get("balance").asText()).isEqualTo("0.00");
    }

    @Test
    void case7_unmatchedNoCandidate() throws Exception {
        send(transfer(sig(), f.wallet(), "312.50"));
        var list = getJson("/payments?status=UNMATCHED", f);
        assertThat(list).hasSize(1);
        assertThat(list.get(0).get("unmatchedReason").asText()).isEqualTo("NO_CANDIDATE");
        assertThat(list.get(0).get("invoiceId").isNull()).isTrue();
        assertThat(list.get(0).get("amountBrl").isNull()).isTrue();
        assertThat(reload(a).get("status").asText()).isEqualTo("OPEN");
        assertThat(reload(b).get("status").asText()).isEqualTo("OPEN");
    }

    @Test
    void case8_otherWalletIsNotACandidate() throws Exception {
        var other = freelancer("other@test.dev");
        var c = createInvoice(other, "1500.00");
        jdbc.update("update invoices set unique_amount = ? where id = ?", dec(a.get("uniqueAmount")),
                UUID.fromString(c.get("id").asText()));
        send(transfer(sig(), f.wallet(), uniqueA()));
        assertThat(reload(a).get("status").asText()).isEqualTo("PAID");
        assertThat(invoice(other, c.get("id").asText()).get("status").asText()).isEqualTo("OPEN");
    }

    @Test
    void case9_cancelledInvoiceByReference() throws Exception {
        mvc.perform(post("/invoices/" + a.get("id").asText() + "/cancel").header("Authorization", f.bearer()))
                .andExpect(status().isOk());
        send(transfer(sig(), f.wallet(), uniqueA(), ra));
        var list = getJson("/payments", f);
        assertThat(list).hasSize(1);
        assertThat(list.get(0).get("status").asText()).isEqualTo("UNMATCHED");
        assertThat(list.get(0).get("unmatchedReason").asText()).isEqualTo("INVOICE_CANCELLED");
        var detail = reload(a);
        assertThat(detail.get("status").asText()).isEqualTo("CANCELLED");
        assertThat(detail.get("amountPaid").asText()).isEqualTo("0.00");
    }

    @Test
    void case10_idempotentReplay() throws Exception {
        var t = transfer(sig(), f.wallet(), uniqueA(), ra);
        send(t, t);
        send(t);
        assertThat(payments.count()).isEqualTo(1);
        var detail = reload(a);
        assertThat(detail.get("amountPaid").asText()).isEqualTo(uniqueA());
        assertThat(detail.get("status").asText()).isEqualTo("PAID");

        // mesma tx, outro logIndex = outra transferência
        var t2 = new java.util.LinkedHashMap<>(t);
        t2.put("logIndex", 1);
        t2.put("amount", "10.00");
        send(t2);
        assertThat(payments.count()).isEqualTo(2);
    }

    @Test
    void case11_nonUsdcIgnored() throws Exception {
        send(transferAt(sig(), f.wallet(), uniqueA(), BLOCK_TIME, OTHER_TOKEN, ra));
        assertThat(payments.count()).isZero();
        assertThat(reload(a).get("status").asText()).isEqualTo("OPEN");
    }

    @Test
    void unknownWalletAndBadItemsAreIgnoredWithoutFailingTheBatch() throws Exception {
        var unknown = transfer(sig(), "UnknownWa11et1111111111111111111111111111111", "5.00");
        var badAmount = transfer(sig(), f.wallet(), "abc");
        var negative = transfer(sig(), f.wallet(), "-1");
        var tooPrecise = transfer(sig(), f.wallet(), "1.0000001");
        Map<String, Object> missingFields = new java.util.LinkedHashMap<>();
        missingFields.put("network", "SOLANA");
        var good = transfer(sig(), f.wallet(), uniqueA(), ra);
        send(unknown, badAmount, negative, tooPrecise, missingFields, good);
        assertThat(payments.count()).isEqualTo(1);
        assertThat(reload(a).get("status").asText()).isEqualTo("PAID");
    }

    @Test
    void ambiguousWhenTwoInvoicesShareTheAmount() throws Exception {
        jdbc.update("update invoices set base_amount = 1500, unique_amount = ? where id = ?",
                dec(a.get("uniqueAmount")), UUID.fromString(b.get("id").asText()));
        send(transfer(sig(), f.wallet(), uniqueA()));
        var list = getJson("/payments?status=AMBIGUOUS", f);
        assertThat(list).hasSize(1);
        assertThat(list.get(0).get("unmatchedReason").asText()).isEqualTo("MULTIPLE_CANDIDATES");
    }

    /** Caso 14 de ponta a ponta: PTAX_DAY recebido no sábado usa a cotação de sexta. */
    @Test
    void case14_ptaxDayOnSaturday() throws Exception {
        setFxRule(f, "PTAX_DAY");
        send(transferAt(sig(), f.wallet(), "100.00", "2026-10-10T15:00:00Z", USDC, ra));
        var p = getJson("/payments", f).get(0);
        assertThat(p.get("fxRule").asText()).isEqualTo("PTAX_DAY");
        assertThat(p.get("fxDate").asText()).isEqualTo("2026-10-09");
        assertThat(p.get("amountBrl").asText()).isEqualTo("500.00");
    }

    @Test
    void internalEndpointsRequireSecret() throws Exception {
        mvc.perform(post("/internal/transfers").contentType(MediaType.APPLICATION_JSON).content("[]"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/internal/transfers").header("X-Internal-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content("[]"))
                .andExpect(status().isAccepted());
    }
}
