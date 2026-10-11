package com.paytrail.fx;

import static org.assertj.core.api.Assertions.assertThat;

import com.paytrail.CoreApiTest;
import com.paytrail.common.Enums.FxRule;
import com.paytrail.common.Enums.Network;
import com.paytrail.common.Money;
import com.paytrail.payment.Payment;
import com.paytrail.payment.PaymentRepository;
import com.paytrail.reconciliation.Reconciliation.MatchMethod;
import com.paytrail.reconciliation.Reconciliation.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class FxIntegrationTest extends CoreApiTest {

    @Autowired
    FxService fx;

    @Autowired
    PaymentRepository payments;

    @Autowired
    ExchangeRateRepository rates;

    @Autowired
    FxRateProvider provider;

    @Test
    void offlineProviderIsUsedInTests() {
        assertThat(provider).isInstanceOf(OfflineFxRateProvider.class);
        assertThat(provider.fetch(LocalDate.of(2026, 10, 10))).isEmpty(); // sábado
        assertThat(provider.fetch(LocalDate.of(2026, 10, 9))).isPresent();
    }

    @Test
    void retryJobFillsMissingBrl() throws Exception {
        var f = freelancer("f@test.dev");
        var inv = createInvoice(f, "100.00");
        // Pagamento conciliado cuja cotação falhou (amountBrl null)
        var p = new Payment(Network.SOLANA, sig(), 0, "from", f.wallet(), new BigDecimal("100.000000"),
                Instant.parse("2026-10-10T15:00:00Z"), f.id());
        p.setStatus(PaymentStatus.MATCHED);
        p.setMatchMethod(MatchMethod.MANUAL);
        p.setInvoiceId(java.util.UUID.fromString(inv.get("id").asText()));
        p.setFxRule(FxRule.PTAX_DAY);
        payments.save(p);

        assertThat(fx.retryMissing()).isEqualTo(1);
        var updated = payments.findById(p.getId()).orElseThrow();
        assertThat(updated.getFxDate()).isEqualTo(LocalDate.of(2026, 10, 9));
        assertThat(updated.getFxRate()).isEqualByComparingTo("5");
        assertThat(updated.getAmountBrl()).isEqualByComparingTo("500.00");
        assertThat(rates.findById(LocalDate.of(2026, 10, 9))).isPresent();
        assertThat(fx.retryMissing()).isZero();
    }

    @Test
    void bcbUrlFormat() {
        assertThat(BcbPtaxClient.url(BcbPtaxClient.DEFAULT_BASE_URL, LocalDate.of(2026, 10, 9)).toString())
                .isEqualTo("https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/"
                        + "CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao=%2710-09-2026%27&$format=json");
    }

    @Test
    void moneyFormatting() {
        assertThat(Money.usdc(new BigDecimal("1500.000000"))).isEqualTo("1500.00");
        assertThat(Money.usdc(new BigDecimal("1500.170000"))).isEqualTo("1500.17");
        assertThat(Money.usdc(new BigDecimal("0.123456"))).isEqualTo("0.123456");
        assertThat(Money.usdc(new BigDecimal("0"))).isEqualTo("0.00");
        assertThat(Money.plain(new BigDecimal("1500.170000"))).isEqualTo("1500.17");
        assertThat(Money.plain(new BigDecimal("1500.000000"))).isEqualTo("1500");
        assertThat(Money.rate(new BigDecimal("5.432150"))).isEqualTo("5.43215");
        assertThat(Money.brl(new BigDecimal("7500.85"))).isEqualTo("7500.85");
    }
}
