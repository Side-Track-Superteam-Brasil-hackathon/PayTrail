package com.paytrail.reconciliation;

import com.paytrail.common.Enums.FxRule;
import java.time.LocalDate;
import java.util.Optional;
import java.util.function.Predicate;

/**
 * Qual data de cotação usar para converter um recebimento em BRL (specs/02-conciliacao.md §3).
 * Feriados não são tratados aqui: o "dia útil" é descoberto perguntando ao BCB se há cotação.
 */
public final class FxDates {

    /** Quantos dias recuar procurando cotação antes de desistir. */
    public static final int MAX_LOOKBACK_DAYS = 7;

    private FxDates() {}

    /** Data de partida da busca, antes de recuar para o dia útil. */
    public static LocalDate anchorDate(FxRule rule, LocalDate receivedOn) {
        return switch (rule) {
            case PTAX_DAY -> receivedOn;
            // Último dia útil da 1ª quinzena do mês anterior → começa no dia 15 e recua.
            case CARNE_LEAO -> receivedOn.minusMonths(1).withDayOfMonth(15);
        };
    }

    /** Recua a partir de {@code anchor} até achar uma data com cotação. */
    public static Optional<LocalDate> resolveQuoteDate(LocalDate anchor, Predicate<LocalDate> hasQuote) {
        for (int i = 0; i <= MAX_LOOKBACK_DAYS; i++) {
            var d = anchor.minusDays(i);
            if (hasQuote.test(d)) return Optional.of(d);
        }
        return Optional.empty();
    }
}
