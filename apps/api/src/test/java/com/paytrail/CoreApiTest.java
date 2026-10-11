package com.paytrail;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paytrail.common.Base58;
import com.paytrail.invoice.InvoiceRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

/** Helpers dos testes de integração do núcleo financeiro (faturas, conciliação, comprovantes, relatórios). */
public abstract class CoreApiTest extends IntegrationTest {

    protected static final String USDC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
    protected static final String OTHER_TOKEN = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    protected static final String SECRET = "test-internal-secret";
    /** Quarta-feira 14/10/2026 12:00 BRT. CARNE_LEAO → cotação de 15/09/2026 (terça). */
    protected static final String BLOCK_TIME = "2026-10-14T15:00:00Z";
    protected static final BigDecimal RATE = new BigDecimal("5");

    @Autowired
    protected ObjectMapper json;

    @Autowired
    protected InvoiceRepository invoiceRepository;

    public record Account(String token, UUID id, String wallet) {
        public String bearer() {
            return "Bearer " + token;
        }
    }

    protected Account register(String email, String role) throws Exception {
        var body = """
                {"email":"%s","password":"password123","name":"Name %s","role":"%s"}""".formatted(email, email, role);
        var res = mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn();
        var tree = json.readTree(res.getResponse().getContentAsString());
        return new Account(tree.get("token").asText(), UUID.fromString(tree.get("user").get("id").asText()), null);
    }

    /** Freelancer com carteira Solana aleatória já cadastrada. */
    protected Account freelancer(String email) throws Exception {
        var a = register(email, "FREELANCER");
        var wallet = Base58.randomSolanaReference();
        mvc.perform(patch("/me").header("Authorization", a.bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"solanaWallet\":\"" + wallet + "\"}"))
                .andExpect(status().isOk());
        return new Account(a.token(), a.id(), wallet);
    }

    protected Account accountant(String email) throws Exception {
        return register(email, "ACCOUNTANT");
    }

    protected void setFxRule(Account a, String rule) throws Exception {
        mvc.perform(patch("/me").header("Authorization", a.bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fxRule\":\"" + rule + "\"}"))
                .andExpect(status().isOk());
    }

    protected JsonNode createInvoice(Account a, String baseAmount) throws Exception {
        return createInvoice(a, baseAmount, "Acme Inc", LocalDate.of(2026, 12, 31));
    }

    protected JsonNode createInvoice(Account a, String baseAmount, String clientName, LocalDate dueDate) throws Exception {
        var body = new LinkedHashMap<String, Object>();
        body.put("clientName", clientName);
        body.put("clientEmail", "billing@acme.test");
        body.put("description", "Landing page");
        body.put("network", "SOLANA");
        body.put("baseAmount", baseAmount);
        body.put("dueDate", dueDate.toString());
        var res = mvc.perform(post("/invoices").header("Authorization", a.bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andReturn();
        return json.readTree(res.getResponse().getContentAsString());
    }

    protected JsonNode getJson(String url, Account a) throws Exception {
        var req = get(url);
        if (a != null) req = req.header("Authorization", a.bearer());
        var res = mvc.perform(req).andExpect(status().isOk()).andReturn();
        return json.readTree(res.getResponse().getContentAsString());
    }

    protected JsonNode invoice(Account a, String id) throws Exception {
        return getJson("/invoices/" + id, a);
    }

    protected String referenceOf(JsonNode invoice) {
        return invoiceRepository.findById(UUID.fromString(invoice.get("id").asText())).orElseThrow().getReference();
    }

    protected static BigDecimal dec(JsonNode node) {
        return new BigDecimal(node.asText());
    }

    protected Map<String, Object> transfer(String txHash, String to, String amount, String... references) {
        return transferAt(txHash, to, amount, BLOCK_TIME, USDC, references);
    }

    protected Map<String, Object> transferAt(String txHash, String to, String amount, String blockTime, String token,
                                           String... references) {
        var t = new LinkedHashMap<String, Object>();
        t.put("network", "SOLANA");
        t.put("txHash", txHash);
        t.put("logIndex", 0);
        t.put("token", token);
        t.put("fromAddress", "Payer1111111111111111111111111111111111111");
        t.put("toAddress", to);
        t.put("amount", amount);
        t.put("blockTime", blockTime);
        t.put("references", List.of(references));
        return t;
    }

    @SafeVarargs
    protected final void send(Map<String, Object>... transfers) throws Exception {
        mvc.perform(post("/internal/transfers").header("X-Internal-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new ArrayList<>(List.of(transfers)))))
                .andExpect(status().isAccepted());
    }

    protected static String sig() {
        return Base58.encode(UUID.randomUUID().toString().getBytes());
    }
}
