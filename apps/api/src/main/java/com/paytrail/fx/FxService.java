package com.paytrail.fx;

import com.paytrail.common.Dates;
import com.paytrail.common.Enums.FxRule;
import com.paytrail.payment.Payment;
import com.paytrail.payment.PaymentRepository;
import com.paytrail.reconciliation.FxDates;
import com.paytrail.reconciliation.Reconciliation.PaymentStatus;
import com.paytrail.user.User;
import com.paytrail.user.UserRepository;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Conversão de pagamentos para BRL (specs/02-conciliacao.md §3).
 * A regra (fxRule) escolhe a data; a cotação vem do cache (exchange_rates) ou do provedor.
 * Falha do provedor nunca derruba a conciliação: amountBrl fica null e o job tenta de novo.
 */
@Service
public class FxService {

    private static final Logger log = LoggerFactory.getLogger(FxService.class);

    private final FxRateProvider provider;
    private final ExchangeRateRepository rates;
    private final PaymentRepository payments;
    private final UserRepository users;
    private final TransactionTemplate newTx;

    public FxService(FxRateProvider provider, ExchangeRateRepository rates, PaymentRepository payments,
                     UserRepository users, PlatformTransactionManager txManager) {
        this.provider = provider;
        this.rates = rates;
        this.payments = payments;
        this.users = users;
        this.newTx = new TransactionTemplate(txManager);
        this.newTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * Preenche fxRule, fxDate, fxRate (compra) e amountBrl. Nunca lança: em falha deixa fxDate/fxRate/amountBrl null.
     *
     * @return true se o BRL foi calculado
     */
    public boolean applyFx(Payment p, FxRule rule) {
        p.setFxRule(rule);
        try {
            var anchor = FxDates.anchorDate(rule, Dates.brtDate(p.getBlockTime()));
            var date = FxDates.resolveQuoteDate(anchor, d -> rateOn(d).isPresent());
            if (date.isEmpty()) {
                log.warn("no FX quote within {} days before {} for payment {}", FxDates.MAX_LOOKBACK_DAYS, anchor, p.getId());
                clear(p);
                return false;
            }
            var rate = rateOn(date.get()).orElseThrow();
            p.setFxDate(rate.getQuoteDate());
            p.setFxRate(rate.getBuyRate());
            p.setAmountBrl(p.getAmount().multiply(rate.getBuyRate()).setScale(2, RoundingMode.HALF_UP));
            return true;
        } catch (RuntimeException e) {
            log.warn("FX conversion failed for payment {}: {}", p.getId(), e.getMessage());
            clear(p);
            return false;
        }
    }

    private static void clear(Payment p) {
        p.setFxDate(null);
        p.setFxRate(null);
        p.setAmountBrl(null);
    }

    /** Cotação de uma data: cache primeiro, depois o provedor (gravando no cache). */
    public Optional<ExchangeRate> rateOn(LocalDate date) {
        var cached = rates.findById(date);
        if (cached.isPresent()) return cached;
        var quote = provider.fetch(date);
        if (quote.isEmpty()) return Optional.empty();
        var q = quote.get();
        var rate = new ExchangeRate(q.date(), q.buyRate(), q.sellRate(), q.source());
        try {
            // Transação própria: corrida no cache não pode derrubar a conciliação em andamento.
            newTx.executeWithoutResult(s -> rates.save(rate));
        } catch (RuntimeException e) {
            log.debug("exchange rate for {} already cached: {}", date, e.getMessage());
        }
        return Optional.of(rate);
    }

    /** Job de nova tentativa: pagamentos conciliados ainda sem BRL. Cada um na sua transação. */
    public int retryMissing() {
        int filled = 0;
        for (var pending : payments.findByStatusAndAmountBrlIsNull(PaymentStatus.MATCHED)) {
            try {
                Boolean ok = newTx.execute(s -> {
                    var p = payments.findById(pending.getId()).orElse(null);
                    if (p == null || p.getAmountBrl() != null) return false;
                    var rule = p.getFxRule() != null ? p.getFxRule()
                            : users.findById(p.getFreelancerId()).map(User::getFxRule).orElse(FxRule.CARNE_LEAO);
                    return applyFx(p, rule);
                });
                if (Boolean.TRUE.equals(ok)) filled++;
            } catch (RuntimeException e) {
                log.warn("FX retry failed for payment {}: {}", pending.getId(), e.getMessage());
            }
        }
        return filled;
    }
}
