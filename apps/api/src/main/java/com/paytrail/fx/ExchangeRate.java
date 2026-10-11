package com.paytrail.fx;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** Cache da cotação do dólar do BCB (PTAX) por data. */
@Entity
@Table(name = "exchange_rates")
public class ExchangeRate {

    @Id
    @Column(name = "quote_date")
    private LocalDate quoteDate;

    @Column(name = "buy_rate", nullable = false, precision = 12, scale = 6)
    private BigDecimal buyRate;

    @Column(name = "sell_rate", nullable = false, precision = 12, scale = 6)
    private BigDecimal sellRate;

    @Column(nullable = false)
    private String source = "BCB_PTAX";

    @Column(name = "fetched_at", nullable = false)
    private Instant fetchedAt = Instant.now();

    protected ExchangeRate() {}

    public ExchangeRate(LocalDate quoteDate, BigDecimal buyRate, BigDecimal sellRate, String source) {
        this.quoteDate = quoteDate;
        this.buyRate = buyRate;
        this.sellRate = sellRate;
        this.source = source;
    }

    public LocalDate getQuoteDate() { return quoteDate; }
    public BigDecimal getBuyRate() { return buyRate; }
    public BigDecimal getSellRate() { return sellRate; }
    public String getSource() { return source; }
    public Instant getFetchedAt() { return fetchedAt; }
}
