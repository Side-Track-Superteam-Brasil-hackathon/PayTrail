package com.paytrail.market;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paytrail.IntegrationTest;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class MarketIntegrationTest extends IntegrationTest {

    @Autowired
    ObjectMapper json;

    @Autowired
    AccessLogRepository logs;

    String anaToken, anaId, carlosToken, carlosId, beaToken, beaId;

    record Session(String token, String id) {}

    private Session register(String email, String name, String role) throws Exception {
        var body = """
                {"email":"%s","password":"password123","name":"%s","role":"%s"}""".formatted(email, name, role);
        var res = mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn();
        var node = json.readTree(res.getResponse().getContentAsString());
        return new Session(node.get("token").asText(), node.get("user").get("id").asText());
    }

    @BeforeEach
    void users() throws Exception {
        var ana = register("ana@test.dev", "Ana Souza", "FREELANCER");
        var carlos = register("carlos@test.dev", "Carlos Lima", "ACCOUNTANT");
        var bea = register("bea@test.dev", "Bea Rocha", "ACCOUNTANT");
        anaToken = ana.token(); anaId = ana.id();
        carlosToken = carlos.token(); carlosId = carlos.id();
        beaToken = bea.token(); beaId = bea.id();
        mvc.perform(patch("/me").header("Authorization", "Bearer " + carlosToken).contentType(MediaType.APPLICATION_JSON)
                .content("{\"city\":\"Sao Paulo\",\"bio\":\"Taxes for devs\",\"specialties\":[\"crypto\",\"MEI\"]}"))
                .andExpect(status().isOk());
    }

    private ResultActions getAs(String token, String url) throws Exception {
        return mvc.perform(get(url).header("Authorization", "Bearer " + token));
    }

    private ResultActions postAs(String token, String url, String body) throws Exception {
        var b = post(url).header("Authorization", "Bearer " + token);
        if (body != null) b = b.contentType(MediaType.APPLICATION_JSON).content(body);
        return mvc.perform(b);
    }

    private JsonNode read(ResultActions r) throws Exception {
        return json.readTree(r.andReturn().getResponse().getContentAsString());
    }

    private String openConversation(String token, String otherId) throws Exception {
        var r = postAs(token, "/conversations", "{\"participantId\":\"" + otherId + "\"}").andExpect(status().isOk());
        return read(r).get("id").asText();
    }

    private static final String PROPOSAL = """
            {"feeAmount":"150.00","feeCurrency":"BRL","periodStart":"2026-10-01","periodEnd":"2026-12-31","note":"monthly"}""";

    private String propose(String token, String convId) throws Exception {
        var r = postAs(token, "/conversations/" + convId + "/proposals", PROPOSAL).andExpect(status().isCreated());
        return read(r).get("id").asText();
    }

    // ----- Directory -----

    @Test
    void directorySearchBySpecialtyAndPrivacy() throws Exception {
        getAs(anaToken, "/users?role=ACCOUNTANT&q=crypto")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Carlos Lima"))
                .andExpect(jsonPath("$[0].specialties[0]").value("crypto"))
                .andExpect(jsonPath("$[0].email").doesNotExist())
                .andExpect(jsonPath("$[0].solanaWallet").doesNotExist());
        getAs(anaToken, "/users?role=ACCOUNTANT").andExpect(jsonPath("$", hasSize(2)));
        getAs(carlosToken, "/users?role=FREELANCER").andExpect(jsonPath("$", hasSize(1)));
        getAs(anaToken, "/users/" + carlosId).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(carlosId));
        getAs(anaToken, "/users/" + UUID.randomUUID()).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mvc.perform(get("/users")).andExpect(status().isUnauthorized());
    }

    // ----- Inbox -----

    @Test
    void conversationIsIdempotentAndRejectsSelf() throws Exception {
        var c1 = openConversation(anaToken, carlosId);
        var c2 = openConversation(carlosToken, anaId);
        org.junit.jupiter.api.Assertions.assertEquals(c1, c2);
        postAs(anaToken, "/conversations", "{\"participantId\":\"" + anaId + "\"}").andExpect(status().isBadRequest());
        postAs(anaToken, "/conversations", "{\"participantId\":\"" + UUID.randomUUID() + "\"}").andExpect(status().isNotFound());
        getAs(anaToken, "/conversations").andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].other.name").value("Carlos Lima"));
    }

    @Test
    void messagingPollingAndPermissions() throws Exception {
        var conv = openConversation(anaToken, carlosId);
        var first = read(postAs(anaToken, "/conversations/" + conv + "/messages", "{\"body\":\"Hi Carlos\"}")
                .andExpect(status().isCreated()).andExpect(jsonPath("$.type").value("TEXT")));
        var after = first.get("createdAt").asText();

        getAs(carlosToken, "/conversations/" + conv + "/messages").andExpect(jsonPath("$", hasSize(1)));
        getAs(carlosToken, "/conversations/" + conv + "/messages?after=" + after).andExpect(jsonPath("$", hasSize(0)));

        postAs(carlosToken, "/conversations/" + conv + "/messages", "{\"body\":\"Hello Ana\"}").andExpect(status().isCreated());
        getAs(anaToken, "/conversations/" + conv + "/messages?after=" + after)
                .andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].body").value("Hello Ana"));

        // ordered by last message, with lastMessage
        var conv2 = openConversation(anaToken, beaId);
        postAs(anaToken, "/conversations/" + conv2 + "/messages", "{\"body\":\"newer\"}").andExpect(status().isCreated());
        getAs(anaToken, "/conversations").andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id").value(conv2))
                .andExpect(jsonPath("$[0].lastMessage.body").value("newer"))
                .andExpect(jsonPath("$[1].lastMessage.body").value("Hello Ana"));

        // non participant
        getAs(beaToken, "/conversations/" + conv + "/messages").andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_PARTICIPANT"));
        postAs(beaToken, "/conversations/" + conv + "/messages", "{\"body\":\"x\"}").andExpect(status().isForbidden());

        // validation
        postAs(anaToken, "/conversations/" + conv + "/messages", "{\"body\":\"\"}").andExpect(status().isBadRequest());
        postAs(anaToken, "/conversations/" + conv + "/messages", "{\"body\":\"" + "a".repeat(4001) + "\"}")
                .andExpect(status().isBadRequest());
        postAs(anaToken, "/conversations/" + conv + "/messages", "{\"body\":\"" + "a".repeat(4000) + "\"}")
                .andExpect(status().isCreated());
    }

    // ----- Proposals -----

    @Test
    void proposalRolesAndValidation() throws Exception {
        var accAcc = openConversation(carlosToken, beaId);
        postAs(carlosToken, "/conversations/" + accAcc + "/proposals", PROPOSAL).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROLES_INVALID"));

        var conv = openConversation(anaToken, carlosId);
        postAs(carlosToken, "/conversations/" + conv + "/proposals",
                "{\"feeAmount\":\"10\",\"feeCurrency\":\"BRL\",\"periodStart\":\"2026-12-01\",\"periodEnd\":\"2026-10-01\"}")
                .andExpect(status().isBadRequest());
        postAs(carlosToken, "/conversations/" + conv + "/proposals",
                "{\"feeAmount\":\"-1\",\"feeCurrency\":\"BRL\",\"periodStart\":\"2026-10-01\",\"periodEnd\":\"2026-10-01\"}")
                .andExpect(status().isBadRequest());
        postAs(beaToken, "/conversations/" + conv + "/proposals", PROPOSAL).andExpect(status().isForbidden());

        postAs(carlosToken, "/conversations/" + conv + "/proposals", PROPOSAL)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SENT"))
                .andExpect(jsonPath("$.feeAmount").value("150.000000"))
                .andExpect(jsonPath("$.accountantId").value(carlosId))
                .andExpect(jsonPath("$.freelancerId").value(anaId))
                .andExpect(jsonPath("$.recipientId").value(anaId));
        postAs(anaToken, "/conversations/" + conv + "/proposals", PROPOSAL).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PROPOSAL_ALREADY_OPEN"));

        getAs(anaToken, "/conversations/" + conv + "/messages")
                .andExpect(jsonPath("$[0].type").value("PROPOSAL"))
                .andExpect(jsonPath("$[0].proposal.status").value("SENT"));
    }

    @Test
    void acceptCreatesAccessAndSystemMessageThenRevoke() throws Exception {
        var conv = openConversation(anaToken, carlosId);
        var proposal = propose(carlosToken, conv);

        postAs(carlosToken, "/proposals/" + proposal + "/accept", null).andExpect(status().isForbidden());
        postAs(beaToken, "/proposals/" + proposal + "/accept", null).andExpect(status().isForbidden());
        postAs(anaToken, "/proposals/" + proposal + "/cancel", null).andExpect(status().isForbidden());

        getAs(carlosToken, "/accountant/clients").andExpect(jsonPath("$", hasSize(0)));
        getAs(anaToken, "/accountant/clients").andExpect(status().isForbidden());

        postAs(anaToken, "/proposals/" + proposal + "/accept", null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.decidedAt").isNotEmpty());
        postAs(anaToken, "/proposals/" + proposal + "/accept", null).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PROPOSAL_NOT_OPEN"));
        postAs(carlosToken, "/proposals/" + proposal + "/cancel", null).andExpect(status().isConflict());

        getAs(anaToken, "/conversations/" + conv + "/messages")
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[1].type").value("SYSTEM"))
                .andExpect(jsonPath("$[1].senderId").doesNotExist())
                .andExpect(jsonPath("$[1].body")
                        .value("Proposal accepted — Carlos can now view Ana's records from Oct 1 to Dec 31, 2026."));

        var clients = getAs(carlosToken, "/accountant/clients").andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].freelancer.name").value("Ana Souza"))
                .andExpect(jsonPath("$[0].currentMonthUsdc").value("0"))
                .andExpect(jsonPath("$[0].currentMonthBrl").value("0"))
                .andExpect(jsonPath("$[0].unmatchedCount").value(0))
                .andExpect(jsonPath("$[0].access.status").value("ACTIVE"));
        var accessId = read(clients).get(0).get("access").get("id").asText();

        getAs(anaToken, "/access").andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].accountant.name").value("Carlos Lima"))
                .andExpect(jsonPath("$[0].periodStart").value("2026-10-01"));
        getAs(carlosToken, "/access").andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].freelancer.name").value("Ana Souza"));

        // logs: visible to freelancer owner only
        logs.save(new AccessLog(UUID.fromString(carlosId), UUID.fromString(anaId), AccessLog.Action.VIEW_REPORT));
        getAs(anaToken, "/access/" + accessId + "/logs").andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].action").value("VIEW_REPORT"))
                .andExpect(jsonPath("$[0].createdAt").isNotEmpty());
        getAs(carlosToken, "/access/" + accessId + "/logs").andExpect(status().isForbidden());

        // revoke: owner only
        postAs(carlosToken, "/access/" + accessId + "/revoke", null).andExpect(status().isForbidden());
        postAs(anaToken, "/access/" + accessId + "/revoke", null).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REVOKED")).andExpect(jsonPath("$.revokedAt").isNotEmpty());
        postAs(anaToken, "/access/" + accessId + "/revoke", null).andExpect(status().isConflict());
        getAs(carlosToken, "/accountant/clients").andExpect(jsonPath("$", hasSize(0)));
        getAs(anaToken, "/access").andExpect(jsonPath("$[0].status").value("REVOKED"));
    }

    @Test
    void newAcceptedProposalRevokesPreviousAccess() throws Exception {
        var conv = openConversation(anaToken, carlosId);
        postAs(anaToken, "/proposals/" + propose(carlosToken, conv) + "/accept", null).andExpect(status().isOk());
        // freelancer proposes this time
        postAs(anaToken, "/conversations/" + conv + "/proposals",
                "{\"feeAmount\":\"0\",\"feeCurrency\":\"USDC\",\"periodStart\":\"2027-01-01\",\"periodEnd\":\"2027-03-31\"}")
                .andExpect(status().isCreated()).andExpect(jsonPath("$.recipientId").value(carlosId));
        var open = read(getAs(anaToken, "/conversations/" + conv + "/messages")).get(2).get("proposal").get("id").asText();
        postAs(carlosToken, "/proposals/" + open + "/accept", null).andExpect(status().isOk());

        getAs(anaToken, "/access").andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[1].status").value("REVOKED"));
        getAs(carlosToken, "/accountant/clients").andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].access.periodStart").value("2027-01-01"));
    }

    @Test
    void rejectAndCancel() throws Exception {
        var conv = openConversation(anaToken, carlosId);
        var p1 = propose(carlosToken, conv);
        postAs(carlosToken, "/proposals/" + p1 + "/reject", null).andExpect(status().isForbidden());
        postAs(anaToken, "/proposals/" + p1 + "/reject", null).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
        postAs(anaToken, "/proposals/" + p1 + "/reject", null).andExpect(status().isConflict());

        var p2 = propose(carlosToken, conv); // a new one can be opened after the previous was decided
        postAs(carlosToken, "/proposals/" + p2 + "/cancel", null).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
        getAs(carlosToken, "/accountant/clients").andExpect(jsonPath("$", hasSize(0)));
        getAs(anaToken, "/conversations/" + conv + "/messages")
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[1].type").value("SYSTEM"))
                .andExpect(jsonPath("$[3].type").value("SYSTEM"));
        postAs(anaToken, "/proposals/" + UUID.randomUUID() + "/accept", null).andExpect(status().isNotFound());
    }
}
