package com.paytrail.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class PasswordPolicyTest {

    @Test
    void acceptsPasswordMeetingEveryRule() {
        assertThat(PasswordPolicy.violations("Pass-word-1234")).isEmpty();
        assertThat(PasswordPolicy.violations("Ação-Contábil-9")).isEmpty();
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "Pass-wd-123  | at least 12 characters",
            "Pass-word-abc | a number",
            "pass-word-1234 | an uppercase letter",
            "PASS-WORD-1234 | a lowercase letter",
            "Password12345 | a symbol",
            "Pass word 1234 | a symbol",
    })
    void reportsEachMissingRule(String password, String missing) {
        assertThat(PasswordPolicy.violations(password)).containsExactly(missing);
    }

    @Test
    void rejectsMoreThan72Bytes() {
        assertThat(PasswordPolicy.violations("Aa1!" + "x".repeat(69))).containsExactly("at most 72 bytes");
    }

    @Test
    void nullOrEmptyFailsEverything() {
        assertThat(PasswordPolicy.violations(null)).hasSize(5);
        assertThat(PasswordPolicy.violations("")).hasSize(5);
    }
}
