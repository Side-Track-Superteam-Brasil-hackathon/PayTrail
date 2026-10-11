package com.paytrail.common;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Formatação de valores para a API (strings decimais, nunca double). */
public final class Money {

    private Money() {}

    /** USDC: no mínimo 2 casas, até 6, sem zeros à direita além disso ("1500.00", "1500.17", "0.123456"). */
    public static String usdc(BigDecimal v) {
        return v == null ? null : minScale(v, 2);
    }

    /** BRL: sempre 2 casas. */
    public static String brl(BigDecimal v) {
        return v == null ? null : v.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    /** Cotação: no mínimo 4 casas ("5.0000", "5.43215"). */
    public static String rate(BigDecimal v) {
        return v == null ? null : minScale(v, 4);
    }

    /** Sem zeros à direita ("1500.17", "1500") — formato do Solana Pay. */
    public static String plain(BigDecimal v) {
        var s = v.stripTrailingZeros();
        if (s.scale() < 0) s = s.setScale(0);
        return s.toPlainString();
    }

    private static String minScale(BigDecimal v, int min) {
        var s = v.stripTrailingZeros();
        if (s.scale() < min) s = s.setScale(min);
        return s.toPlainString();
    }
}
