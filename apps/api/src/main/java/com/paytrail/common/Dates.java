package com.paytrail.common;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;

/** Datas de negócio no fuso America/Sao_Paulo (BRT). */
public final class Dates {

    public static final ZoneId BRT = ZoneId.of("America/Sao_Paulo");

    private Dates() {}

    public static LocalDate todayBrt() {
        return LocalDate.now(BRT);
    }

    public static LocalDate brtDate(Instant instant) {
        return instant.atZone(BRT).toLocalDate();
    }

    /** Início do mês (inclusive) em BRT. */
    public static Instant monthStart(YearMonth month) {
        return month.atDay(1).atStartOfDay(BRT).toInstant();
    }

    /** Fim do mês (exclusivo) em BRT. */
    public static Instant monthEnd(YearMonth month) {
        return monthStart(month.plusMonths(1));
    }
}
