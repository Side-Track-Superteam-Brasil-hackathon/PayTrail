package com.paytrail.payment;

import com.paytrail.common.Enums.FxRule;
import com.paytrail.common.Enums.Network;
import com.paytrail.common.ExplorerLinks;
import com.paytrail.common.Money;
import com.paytrail.reconciliation.Reconciliation.MatchMethod;
import com.paytrail.reconciliation.Reconciliation.PaymentStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Schema Payment de specs/03-api.yaml. */
public record PaymentDto(
        UUID id,
        Network network,
        String txHash,
        String explorerUrl,
        String fromAddress,
        String toAddress,
        String amount,
        Instant blockTime,
        UUID invoiceId,
        PaymentStatus status,
        MatchMethod matchMethod,
        String unmatchedReason,
        FxRule fxRule,
        LocalDate fxDate,
        String fxRate,
        String amountBrl) {

    public static PaymentDto of(Payment p, ExplorerLinks links) {
        return new PaymentDto(p.getId(), p.getNetwork(), p.getTxHash(), links.tx(p.getNetwork(), p.getTxHash()),
                p.getFromAddress(), p.getToAddress(), Money.usdc(p.getAmount()), p.getBlockTime(), p.getInvoiceId(),
                p.getStatus(), p.getMatchMethod(), p.getUnmatchedReason(), p.getFxRule(), p.getFxDate(),
                Money.rate(p.getFxRate()), Money.brl(p.getAmountBrl()));
    }
}
