package com.paytrail.invoice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.paytrail.CoreApiTest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class InvoiceIntegrationTest extends CoreApiTest {

    private static String body(String network, String amount) {
        return """
                {"clientName":"Acme","description":"Work","network":"%s","baseAmount":"%s","dueDate":"2026-12-31"}"""
                .formatted(network, amount);
    }

    @Test
    void createInvoiceA1() throws Exception {
        var ana = freelancer("ana@test.dev");
        var inv = createInvoice(ana, "1500.00");

        assertThat(inv.get("publicId").asText()).matches("INV-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}");
        assertThat(inv.get("status").asText()).isEqualTo("OPEN");
        assertThat(inv.get("network").asText()).isEqualTo("SOLANA");
        assertThat(inv.get("recipientAddress").asText()).isEqualTo(ana.wallet());
        assertThat(inv.get("baseAmount").asText()).isEqualTo("1500.00");
        var unique = dec(inv.get("uniqueAmount"));
        var suffix = unique.subtract(new BigDecimal("1500"));
        assertThat(suffix).isBetween(new BigDecimal("0.01"), new BigDecimal("0.99"));
        assertThat(inv.get("uniqueAmount").asText()).matches("1500\\.\\d\\d");
        assertThat(inv.get("amountPaid").asText()).isEqualTo("0.00");
        assertThat(inv.get("balance").asText()).isEqualTo(inv.get("uniqueAmount").asText());
        assertThat(inv.get("excess").asText()).isEqualTo("0.00");
        assertThat(inv.get("overdue").asBoolean()).isFalse();
        assertThat(inv.get("payUrl").asText()).endsWith("/pay/" + inv.get("publicId").asText());
        assertThat(inv.get("createdAt").asText()).isNotBlank();
        assertThat(referenceOf(inv)).isNotBlank();

        var detail = invoice(ana, inv.get("id").asText());
        assertThat(detail.get("publicId").asText()).isEqualTo(inv.get("publicId").asText());
        assertThat(detail.get("payments")).isEmpty();
        assertThat(detail.get("events")).hasSize(1);
        assertThat(detail.get("events").get(0).get("type").asText()).isEqualTo("CREATED");
    }

    @Test
    void validationErrors() throws Exception {
        var noWallet = register("nowallet@test.dev", "FREELANCER");
        mvc.perform(post("/invoices").header("Authorization", noWallet.bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content(body("SOLANA", "100.00")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("WALLET_NOT_SET"));

        var ana = freelancer("ana@test.dev");
        for (var bad : new String[] {"0", "-5", "100.001", "abc"}) {
            mvc.perform(post("/invoices").header("Authorization", ana.bearer()).contentType(MediaType.APPLICATION_JSON)
                            .content(body("SOLANA", bad)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_AMOUNT"));
        }
        mvc.perform(post("/invoices").header("Authorization", ana.bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content(body("ARC", "100.00")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("NETWORK_NOT_SUPPORTED"));
        mvc.perform(post("/invoices").header("Authorization", ana.bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"x\",\"network\":\"SOLANA\",\"baseAmount\":\"1\",\"dueDate\":\"2026-12-31\"}"))
                .andExpect(status().isBadRequest());

        var carlos = accountant("carlos@test.dev");
        mvc.perform(post("/invoices").header("Authorization", carlos.bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content(body("SOLANA", "100.00")))
                .andExpect(status().isForbidden());
        mvc.perform(post("/invoices").contentType(MediaType.APPLICATION_JSON).content(body("SOLANA", "100.00")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listFilterOwnershipAndOverdue() throws Exception {
        var ana = freelancer("ana@test.dev");
        var bob = freelancer("bob@test.dev");
        var yesterday = LocalDate.now(ZoneId.of("America/Sao_Paulo")).minusDays(1);
        var overdue = createInvoice(ana, "100.00", "Late Co", yesterday);
        var other = createInvoice(ana, "200.00");
        createInvoice(bob, "300.00");

        mvc.perform(post("/invoices/" + other.get("id").asText() + "/cancel").header("Authorization", ana.bearer()))
                .andExpect(status().isOk());

        assertThat(getJson("/invoices", ana)).hasSize(2);
        var open = getJson("/invoices?status=OPEN", ana);
        assertThat(open).hasSize(1);
        assertThat(open.get(0).get("id").asText()).isEqualTo(overdue.get("id").asText());
        assertThat(open.get(0).get("overdue").asBoolean()).isTrue();
        assertThat(getJson("/invoices?status=CANCELLED", ana)).hasSize(1);

        // Fatura de outro freelancer: 404
        mvc.perform(get("/invoices/" + overdue.get("id").asText()).header("Authorization", bob.bearer()))
                .andExpect(status().isNotFound());
        mvc.perform(post("/invoices/" + overdue.get("id").asText() + "/cancel").header("Authorization", bob.bearer()))
                .andExpect(status().isNotFound());
    }

    @Test
    void cancel() throws Exception {
        var ana = freelancer("ana@test.dev");
        var inv = createInvoice(ana, "1500.00");
        var id = inv.get("id").asText();

        mvc.perform(post("/invoices/" + id + "/cancel").header("Authorization", ana.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
        var events = invoice(ana, id).get("events");
        assertThat(events).hasSize(2);
        assertThat(events.get(1).get("type").asText()).isEqualTo("CANCELLED");

        // Com pagamento: 409
        var paid = createInvoice(ana, "700.00");
        send(transfer(sig(), ana.wallet(), "100.00", referenceOf(paid)));
        mvc.perform(post("/invoices/" + paid.get("id").asText() + "/cancel").header("Authorization", ana.bearer()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVOICE_HAS_PAYMENTS"));
    }

    /** Caso 13: a 100ª fatura aberta na mesma carteira não tem sufixo livre. */
    @Test
    void case13_noUniqueSuffix() throws Exception {
        var ana = freelancer("ana@test.dev");
        var amounts = new java.util.HashSet<String>();
        for (int i = 0; i < 99; i++) {
            amounts.add(createInvoice(ana, "10.00").get("uniqueAmount").asText());
        }
        assertThat(amounts).hasSize(99);
        mvc.perform(post("/invoices").header("Authorization", ana.bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content(body("SOLANA", "50.00")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NO_UNIQUE_SUFFIX"));

        // Cancelar uma libera um sufixo
        var first = getJson("/invoices", ana).get(0).get("id").asText();
        mvc.perform(post("/invoices/" + first + "/cancel").header("Authorization", ana.bearer())).andExpect(status().isOk());
        createInvoice(ana, "50.00");
    }

    @Test
    void publicPayPage() throws Exception {
        var ana = freelancer("ana@test.dev");
        var inv = createInvoice(ana, "1500.00");
        var publicId = inv.get("publicId").asText();
        var unique = inv.get("uniqueAmount").asText();
        var ref = referenceOf(inv);

        var page = getJson("/pay/" + publicId, null);
        assertThat(page.get("publicId").asText()).isEqualTo(publicId);
        assertThat(page.get("freelancerName").asText()).isEqualTo("Name ana@test.dev");
        assertThat(page.get("clientName").asText()).isEqualTo("Acme Inc");
        assertThat(page.get("description").asText()).isEqualTo("Landing page");
        assertThat(page.get("network").asText()).isEqualTo("SOLANA");
        assertThat(page.get("recipientAddress").asText()).isEqualTo(ana.wallet());
        assertThat(page.get("amountToSend").asText()).isEqualTo(unique);
        assertThat(page.get("status").asText()).isEqualTo("OPEN");
        assertThat(page.get("solanaPayUrl").asText()).isEqualTo("solana:" + ana.wallet() + "?amount=" + unique
                + "&spl-token=" + USDC + "&reference=" + ref + "&label=PayTrail&message=" + publicId);

        // Parcial: amountToSend = saldo
        send(transfer(sig(), ana.wallet(), "700.00", ref));
        var balance = dec(inv.get("uniqueAmount")).subtract(new BigDecimal("700"));
        page = getJson("/pay/" + publicId, null);
        assertThat(dec(page.get("amountToSend"))).isEqualByComparingTo(balance);
        assertThat(page.get("status").asText()).isEqualTo("PARTIALLY_PAID");
        assertThat(page.get("solanaPayUrl").asText()).contains("amount=" + balance.stripTrailingZeros().toPlainString() + "&");

        mvc.perform(get("/pay/INV-NOPE00")).andExpect(status().isNotFound());
    }

    @Test
    void solanaPayAmountHasNoTrailingZeros() {
        assertThat(PayPageController.solanaPayUrl("W", "1500", "M", "R", "INV-AAAAAA"))
                .isEqualTo("solana:W?amount=1500&spl-token=M&reference=R&label=PayTrail&message=INV-AAAAAA");
    }

    @Test
    void watchTargets() throws Exception {
        var ana = freelancer("ana@test.dev");
        var bob = freelancer("bob@test.dev");
        register("nowallet@test.dev", "FREELANCER");
        var a = createInvoice(ana, "100.00");
        var b = createInvoice(bob, "200.00");
        var cancelled = createInvoice(bob, "300.00");
        mvc.perform(post("/invoices/" + cancelled.get("id").asText() + "/cancel").header("Authorization", bob.bearer()))
                .andExpect(status().isOk());

        var res = mvc.perform(get("/internal/watch-targets").header("X-Internal-Secret", SECRET))
                .andExpect(status().isOk()).andReturn();
        var targets = json.readTree(res.getResponse().getContentAsString());
        var wallets = new java.util.ArrayList<String>();
        targets.get("solana").get("wallets").forEach(n -> wallets.add(n.asText()));
        var refs = new java.util.ArrayList<String>();
        targets.get("solana").get("references").forEach(n -> refs.add(n.asText()));
        assertThat(wallets).containsExactlyInAnyOrder(ana.wallet(), bob.wallet());
        assertThat(refs).containsExactlyInAnyOrder(referenceOf(a), referenceOf(b));

        mvc.perform(get("/internal/watch-targets").header("X-Internal-Secret", "wrong")).andExpect(status().isUnauthorized());
    }
}
