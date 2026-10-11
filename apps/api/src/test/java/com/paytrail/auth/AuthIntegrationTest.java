package com.paytrail.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.paytrail.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

class AuthIntegrationTest extends IntegrationTest {

    @Autowired
    ObjectMapper json;

    private String register(String email, String role) throws Exception {
        var body = """
                {"email":"%s","password":"password123","name":"Test","role":"%s"}""".formatted(email, role);
        var res = mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.role").value(role))
                .andReturn();
        return json.readTree(res.getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    void registerLoginAndMe() throws Exception {
        var token = register("ana@test.dev", "FREELANCER");

        mvc.perform(get("/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ana@test.dev"))
                .andExpect(jsonPath("$.fxRule").value("CARNE_LEAO"));

        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ana@test.dev\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ana@test.dev\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void duplicateEmailIsRejected() throws Exception {
        register("dup@test.dev", "ACCOUNTANT");
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"dup@test.dev\",\"password\":\"password123\",\"name\":\"X\",\"role\":\"FREELANCER\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));
    }

    @Test
    void walletMustBeAValidSolanaAddress() throws Exception {
        var token = register("w@test.dev", "FREELANCER");
        mvc.perform(patch("/me").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"solanaWallet\":\"not-a-wallet\"}"))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(patch("/me").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"solanaWallet\":\"4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.solanaWallet").value("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"));
    }

    @Test
    void protectedRoutesNeedToken() throws Exception {
        mvc.perform(get("/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/internal/watch-targets")).andExpect(status().isUnauthorized());
    }
}
