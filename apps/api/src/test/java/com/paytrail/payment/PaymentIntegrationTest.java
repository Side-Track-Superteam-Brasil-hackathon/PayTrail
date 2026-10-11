package com.paytrail.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.paytrail.CoreApiTest;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class PaymentIntegrationTest extends CoreApiTest {

    private org.springframework.test.web.servlet.ResultActions match(Account who, String paymentId, String invoiceId)
            throws Exception {
        return mvc.perform(post("/payments/" + paymentId + "/match").header("Authorization", who.bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"invoiceId\":\"" + invoiceId + "\"}"));
    }

    /** Caso 12: UNMATCHED 312.50 associado manualmente a B (300.xx) → B OVERPAID, MANUAL. */
    @Test
    void case12_manualMatch() throws Exception {
        var f = freelancer("f@test.dev");
        var b = createInvoice(f, "300.00");
        send(transfer(sig(), f.wallet(), "312.50"));
        var unmatched = getJson("/payments?status=UNMATCHED", f);
        assertThat(unmatched).hasSize(1);
        var paymentId = unmatched.get(0).get("id").asText();

        match(f, paymentId, b.get("id").asText())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("MATCHED"))
                .andExpect(jsonPath("$.matchMethod").value("MANUAL"))
                .andExpect(jsonPath("$.invoiceId").value(b.get("id").asText()))
                .andExpect(jsonPath("$.unmatchedReason").isEmpty())
                .andExpect(jsonPath("$.amountBrl").value("1562.50"));

        var detail = invoice(f, b.get("id").asText());
        assertThat(detail.get("status").asText()).isEqualTo("OVERPAID");
        assertThat(dec(detail.get("excess"))).isEqualByComparingTo(new BigDecimal("312.50").subtract(dec(b.get("uniqueAmount"))));
        var types = new java.util.ArrayList<String>();
        detail.get("events").forEach(e -> types.add(e.get("type").asText()));
        assertThat(types).containsExactly("CREATED", "MANUAL_MATCH", "STATUS_CHANGED");

        assertThat(getJson("/payments?status=UNMATCHED", f)).isEmpty();
        assertThat(getJson("/payments?status=MATCHED", f)).hasSize(1);

        // De novo: já conciliado
        match(f, paymentId, b.get("id").asText())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PAYMENT_ALREADY_MATCHED"));
    }

    @Test
    void manualMatchRules() throws Exception {
        var f = freelancer("f@test.dev");
        var g = freelancer("g@test.dev");
        var cancelled = createInvoice(f, "100.00");
        mvc.perform(post("/invoices/" + cancelled.get("id").asText() + "/cancel").header("Authorization", f.bearer()))
                .andExpect(status().isOk());
        var gInvoice = createInvoice(g, "100.00");
        send(transfer(sig(), f.wallet(), "57.30"));
        var paymentId = getJson("/payments", f).get(0).get("id").asText();

        match(f, paymentId, cancelled.get("id").asText())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVOICE_CANCELLED"));
        // fatura de outro freelancer
        match(f, paymentId, gInvoice.get("id").asText()).andExpect(status().isNotFound());
        // pagamento de outro freelancer
        match(g, paymentId, gInvoice.get("id").asText()).andExpect(status().isNotFound());
        // sem invoiceId
        mvc.perform(post("/payments/" + paymentId + "/match").header("Authorization", f.bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        assertThat(getJson("/payments", g)).isEmpty();
    }

    /** A4: parcial pelo link + avulso associado manualmente → saldo diminui. */
    @Test
    void a4_partialThenManualMatchReducesBalance() throws Exception {
        var f = freelancer("f@test.dev");
        var inv = createInvoice(f, "1000.00");
        send(transfer(sig(), f.wallet(), "400.00", referenceOf(inv)), transfer(sig(), f.wallet(), "57.30"));
        var detail = invoice(f, inv.get("id").asText());
        assertThat(detail.get("status").asText()).isEqualTo("PARTIALLY_PAID");
        var paymentId = getJson("/payments?status=UNMATCHED", f).get(0).get("id").asText();
        match(f, paymentId, inv.get("id").asText()).andExpect(status().isOk());
        detail = invoice(f, inv.get("id").asText());
        assertThat(detail.get("amountPaid").asText()).isEqualTo("457.30");
        assertThat(dec(detail.get("balance"))).isEqualByComparingTo(dec(inv.get("uniqueAmount")).subtract(new BigDecimal("457.30")));
        assertThat(detail.get("status").asText()).isEqualTo("PARTIALLY_PAID");
    }

    @Test
    void accountantCannotListPayments() throws Exception {
        var c = accountant("c@test.dev");
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/payments")
                        .header("Authorization", c.bearer()))
                .andExpect(status().isForbidden());
    }
}
