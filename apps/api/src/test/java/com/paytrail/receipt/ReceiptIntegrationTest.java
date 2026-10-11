package com.paytrail.receipt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.paytrail.CoreApiTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** A5: comprovante verificável. */
class ReceiptIntegrationTest extends CoreApiTest {

    private JsonNode verifyJson(String body) throws Exception {
        var res = mvc.perform(post("/verify").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn();
        return json.readTree(res.getResponse().getContentAsString());
    }

    @Test
    void generateVerifyAndTamper() throws Exception {
        var f = freelancer("f@test.dev");
        var inv = createInvoice(f, "1500.00");
        var tx = sig();
        send(transfer(tx, f.wallet(), inv.get("uniqueAmount").asText(), referenceOf(inv)));

        var res = mvc.perform(post("/invoices/" + inv.get("id").asText() + "/receipt").header("Authorization", f.bearer()))
                .andExpect(status().isCreated()).andReturn();
        var receipt = json.readTree(res.getResponse().getContentAsString());
        var sha = receipt.get("sha256").asText();
        var canonical = receipt.get("canonicalJson").asText();
        assertThat(sha).matches("[0-9a-f]{64}");
        assertThat(receipt.get("invoiceId").asText()).isEqualTo(inv.get("id").asText());
        assertThat(receipt.get("verifyUrl").asText()).endsWith("/verify/" + sha);
        assertThat(receipt.get("anchorTx").isNull()).isTrue();
        assertThat(receipt.get("id").asText()).isNotBlank();

        // Conteúdo e forma canônica
        assertThat(canonical).doesNotContain(" \"").doesNotContain("\n").startsWith("{\"assumptions\":[\"1 USDC = 1 USD\"]");
        assertThat(canonical).contains("\"publicId\":\"" + inv.get("publicId").asText() + "\"");
        assertThat(canonical).contains("\"txHash\":\"" + tx + "\"");
        assertThat(canonical).contains("\"matchMethod\":\"REFERENCE\"");
        assertThat(canonical).contains("\"fxRate\":\"5.0000\"");
        assertThat(CanonicalJson.canonicalize(canonical)).isEqualTo(canonical);
        assertThat(CanonicalJson.sha256Hex(CanonicalJson.canonicalize(canonical))).isEqualTo(sha);

        // GET /verify/{sha} público
        mvc.perform(get("/verify/" + sha))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.receipt.sha256").value(sha))
                .andExpect(jsonPath("$.receipt.canonicalJson").value(canonical));
        mvc.perform(get("/verify/" + "0".repeat(64))).andExpect(status().isNotFound());

        // POST /verify com o mesmo JSON (canônico ou reformatado) → válido
        var same = verifyJson(canonical);
        assertThat(same.get("sha256").asText()).isEqualTo(sha);
        assertThat(same.get("valid").asBoolean()).isTrue();
        var pretty = json.writerWithDefaultPrettyPrinter().writeValueAsString(json.readTree(canonical));
        assertThat(verifyJson(pretty).get("valid").asBoolean()).isTrue();

        // Adulterado → inválido
        var tampered = (ObjectNode) json.readTree(canonical);
        ((ObjectNode) tampered.get("invoice")).put("clientName", "Someone Else");
        var bad = verifyJson(json.writeValueAsString(tampered));
        assertThat(bad.get("valid").asBoolean()).isFalse();
        assertThat(bad.get("sha256").asText()).isNotEqualTo(sha);

        // Evento na trilha
        var events = invoice(f, inv.get("id").asText()).get("events");
        assertThat(events.get(events.size() - 1).get("type").asText()).isEqualTo("RECEIPT_GENERATED");
        assertThat(events.get(events.size() - 1).get("payload").get("sha256").asText()).isEqualTo(sha);
    }

    @Test
    void onlyOwnerCanGenerate() throws Exception {
        var f = freelancer("f@test.dev");
        var g = freelancer("g@test.dev");
        var inv = createInvoice(f, "100.00");
        mvc.perform(post("/invoices/" + inv.get("id").asText() + "/receipt").header("Authorization", g.bearer()))
                .andExpect(status().isNotFound());
        mvc.perform(post("/invoices/" + inv.get("id").asText() + "/receipt")).andExpect(status().isUnauthorized());
    }

    @Test
    void verifyRejectsInvalidJson() throws Exception {
        mvc.perform(post("/verify").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_JSON"));
    }

    @Test
    void canonicalization() {
        var c = CanonicalJson.canonicalize("{ \"b\": 1500.10, \"a\": [true, null, {\"z\":1,\"y\":\"x\\\"\"}] }");
        assertThat(c).isEqualTo("{\"a\":[true,null,{\"y\":\"x\\\"\",\"z\":\"1\"}],\"b\":\"1500.10\"}");
        assertThat(CanonicalJson.canonicalize(c)).isEqualTo(c);
        assertThat(CanonicalJson.sha256Hex("abc"))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}
