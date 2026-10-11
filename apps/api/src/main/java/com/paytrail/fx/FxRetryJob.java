package com.paytrail.fx;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/** A cada 5 min tenta preencher o BRL de pagamentos cuja cotação falhou. Só com o BCB real ligado. */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "paytrail.bcb.enabled", havingValue = "true", matchIfMissing = true)
public class FxRetryJob {

    private static final Logger log = LoggerFactory.getLogger(FxRetryJob.class);

    private final FxService fx;

    public FxRetryJob(FxService fx) {
        this.fx = fx;
    }

    @Scheduled(fixedDelayString = "PT5M", initialDelayString = "PT1M")
    public void run() {
        int filled = fx.retryMissing();
        if (filled > 0) log.info("FX retry: {} payments converted to BRL", filled);
    }
}
