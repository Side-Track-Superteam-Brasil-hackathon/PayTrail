package com.paytrail.auth;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Política de senha do cadastro (specs/00-produto.md §Decisões fixadas). Função pura.
 * Retorna os requisitos violados; lista vazia = senha aceita.
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 12;
    /** BCrypt só usa os primeiros 72 bytes; o encoder do Spring rejeita senhas maiores. */
    public static final int MAX_BYTES = 72;

    private PasswordPolicy() {}

    public static List<String> violations(String password) {
        var out = new ArrayList<String>();
        if (password == null) password = "";
        if (password.codePointCount(0, password.length()) < MIN_LENGTH) out.add("at least " + MIN_LENGTH + " characters");
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) out.add("at most " + MAX_BYTES + " bytes");
        if (password.codePoints().noneMatch(Character::isDigit)) out.add("a number");
        if (password.codePoints().noneMatch(Character::isUpperCase)) out.add("an uppercase letter");
        if (password.codePoints().noneMatch(Character::isLowerCase)) out.add("a lowercase letter");
        if (password.codePoints().noneMatch(PasswordPolicy::isSymbol)) out.add("a symbol");
        return out;
    }

    private static boolean isSymbol(int cp) {
        return !Character.isLetterOrDigit(cp) && !Character.isWhitespace(cp);
    }
}
