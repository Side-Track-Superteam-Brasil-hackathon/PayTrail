package com.paytrail.fx;

import com.fasterxml.jackson.databind.JsonNode;
import com.paytrail.config.PayTrailProperties;
import java.math.RoundingMode;
import java.net.URI;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Cotação PTAX do BCB (API Olinda). Campo cotacaoCompra = taxa de compra. */
@Component
@ConditionalOnProperty(name = "paytrail.bcb.enabled", havingValue = "true", matchIfMissing = true)
public class BcbPtaxClient implements FxRateProvider {

    static final String DEFAULT_BASE_URL = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata";
    private static final DateTimeFormatter BCB_DATE = DateTimeFormatter.ofPattern("MM-dd-yyyy");

    private final RestClient http;
    private final String baseUrl;

    public BcbPtaxClient(RestClient.Builder builder, PayTrailProperties props) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(10_000);
        this.http = builder.requestFactory(factory).build();
        var base = props.bcb() == null ? null : props.bcb().baseUrl();
        if (base == null || base.isBlank()) base = DEFAULT_BASE_URL;
        this.baseUrl = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }

    /** URL já codificada (aspas e $ são válidos em URI), para o RestClient não re-codificar. */
    static URI url(String baseUrl, LocalDate date) {
        return URI.create(baseUrl + "/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao=%27"
                + BCB_DATE.format(date) + "%27&$format=json");
    }

    @Override
    public Optional<Quote> fetch(LocalDate date) {
        JsonNode body;
        try {
            body = http.get().uri(url(baseUrl, date)).retrieve().body(JsonNode.class);
        } catch (RuntimeException e) {
            throw new FxUnavailableException("BCB PTAX request failed for " + date, e);
        }
        if (body == null || !body.has("value")) {
            throw new FxUnavailableException("unexpected BCB PTAX response for " + date, null);
        }
        var values = body.get("value");
        if (!values.isArray() || values.isEmpty()) return Optional.empty();
        var q = values.get(values.size() - 1);
        if (!q.hasNonNull("cotacaoCompra") || !q.hasNonNull("cotacaoVenda")) {
            throw new FxUnavailableException("BCB PTAX response without rates for " + date, null);
        }
        return Optional.of(new Quote(date,
                q.get("cotacaoCompra").decimalValue().setScale(6, RoundingMode.HALF_UP),
                q.get("cotacaoVenda").decimalValue().setScale(6, RoundingMode.HALF_UP),
                "BCB_PTAX"));
    }
}
