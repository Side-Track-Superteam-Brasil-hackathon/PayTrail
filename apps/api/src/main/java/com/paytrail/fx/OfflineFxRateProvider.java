package com.paytrail.fx;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Provedor determinístico usado quando paytrail.bcb.enabled=false (testes, demo offline):
 * cotação só em dias úteis (sem feriados), compra 5.0000 / venda 5.0010.
 */
@Component
@ConditionalOnProperty(name = "paytrail.bcb.enabled", havingValue = "false")
public class OfflineFxRateProvider implements FxRateProvider {

    public static final BigDecimal BUY = new BigDecimal("5.000000");
    public static final BigDecimal SELL = new BigDecimal("5.001000");

    @Override
    public Optional<Quote> fetch(LocalDate date) {
        var dow = date.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) return Optional.empty();
        return Optional.of(new Quote(date, BUY, SELL, "OFFLINE"));
    }
}
