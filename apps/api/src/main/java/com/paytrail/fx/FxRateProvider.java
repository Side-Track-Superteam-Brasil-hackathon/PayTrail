package com.paytrail.fx;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

/** Fonte da cotação do dólar por data (specs/02-conciliacao.md §3). */
public interface FxRateProvider {

    record Quote(LocalDate date, BigDecimal buyRate, BigDecimal sellRate, String source) {}

    /**
     * @return a cotação do dia, ou vazio se não houver cotação nessa data (fim de semana, feriado)
     * @throws FxUnavailableException se a fonte não respondeu
     */
    Optional<Quote> fetch(LocalDate date);

    class FxUnavailableException extends RuntimeException {
        public FxUnavailableException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
