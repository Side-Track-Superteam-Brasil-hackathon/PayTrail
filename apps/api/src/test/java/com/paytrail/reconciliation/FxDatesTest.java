package com.paytrail.reconciliation;

import static org.assertj.core.api.Assertions.assertThat;

import com.paytrail.common.Enums.FxRule;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.function.Predicate;
import org.junit.jupiter.api.Test;

class FxDatesTest {

    /** Simula o BCB: só há cotação em dias úteis (sem feriados). */
    static final Predicate<LocalDate> WEEKDAYS =
            d -> d.getDayOfWeek() != DayOfWeek.SATURDAY && d.getDayOfWeek() != DayOfWeek.SUNDAY;

    /** Caso 14: recebido no sábado 10/10/2026 com PTAX_DAY usa a cotação de sexta 09/10. */
    @Test
    void case14_ptaxDayOnSaturdayFallsBackToFriday() {
        var anchor = FxDates.anchorDate(FxRule.PTAX_DAY, LocalDate.of(2026, 10, 10));
        assertThat(anchor).isEqualTo(LocalDate.of(2026, 10, 10));
        assertThat(FxDates.resolveQuoteDate(anchor, WEEKDAYS)).contains(LocalDate.of(2026, 10, 9));
    }

    /** Caso 15: recebido em 20/10/2026 com CARNE_LEAO usa o último dia útil ≤ 15/09/2026 (uma terça). */
    @Test
    void case15_carneLeaoUsesFirstHalfOfPreviousMonth() {
        var anchor = FxDates.anchorDate(FxRule.CARNE_LEAO, LocalDate.of(2026, 10, 20));
        assertThat(anchor).isEqualTo(LocalDate.of(2026, 9, 15));
        assertThat(FxDates.resolveQuoteDate(anchor, WEEKDAYS)).contains(LocalDate.of(2026, 9, 15));
    }

    @Test
    void carneLeaoWhen15thIsSundayFallsBackToFriday() {
        // 15/11/2026 é domingo → sexta 13/11
        var anchor = FxDates.anchorDate(FxRule.CARNE_LEAO, LocalDate.of(2026, 12, 3));
        assertThat(FxDates.resolveQuoteDate(anchor, WEEKDAYS)).contains(LocalDate.of(2026, 11, 13));
    }

    @Test
    void givesUpAfterLookbackWindow() {
        assertThat(FxDates.resolveQuoteDate(LocalDate.of(2026, 10, 10), d -> false)).isEmpty();
    }
}
