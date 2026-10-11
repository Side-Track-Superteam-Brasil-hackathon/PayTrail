package com.paytrail.reconciliation;

import com.paytrail.common.Enums.Network;
import com.paytrail.common.Enums.Role;
import com.paytrail.config.PayTrailProperties;
import com.paytrail.fx.FxService;
import com.paytrail.invoice.Invoice;
import com.paytrail.invoice.InvoiceEvent;
import com.paytrail.invoice.InvoiceEventRepository;
import com.paytrail.invoice.InvoiceRepository;
import com.paytrail.payment.Payment;
import com.paytrail.payment.PaymentRepository;
import com.paytrail.reconciliation.Reconciliation.IncomingTransfer;
import com.paytrail.reconciliation.Reconciliation.InvoiceSnapshot;
import com.paytrail.reconciliation.Reconciliation.MatchMethod;
import com.paytrail.reconciliation.Reconciliation.PaymentStatus;
import com.paytrail.user.User;
import com.paytrail.user.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Pipeline de um pagamento detectado (specs/02-conciliacao.md §2): filtro → idempotência → DETECTED →
 * matching → aplicação na fatura + eventos + BRL, tudo na mesma transação. Cada transfer do lote tem
 * a sua transação, para que um item ruim não derrube o lote.
 */
@Service
public class ReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(ReconciliationService.class);

    /** O que aconteceu com cada transfer do lote. */
    public enum Outcome { IGNORED, DUPLICATE, MATCHED, UNMATCHED, AMBIGUOUS, FAILED }

    /** DetectedTransfer de specs/03-api.yaml (enviado pelo watcher). */
    public record DetectedTransfer(
            Network network,
            String txHash,
            Integer logIndex,
            String token,
            String fromAddress,
            String toAddress,
            String amount,
            Instant blockTime,
            List<String> references,
            String contractInvoiceId) {}

    private final InvoiceRepository invoices;
    private final InvoiceEventRepository events;
    private final PaymentRepository payments;
    private final UserRepository users;
    private final FxService fx;
    private final TransactionTemplate tx;
    private final String usdcMint;

    public ReconciliationService(InvoiceRepository invoices, InvoiceEventRepository events, PaymentRepository payments,
                                 UserRepository users, FxService fx, PlatformTransactionManager txManager,
                                 PayTrailProperties props) {
        this.invoices = invoices;
        this.events = events;
        this.payments = payments;
        this.users = users;
        this.fx = fx;
        this.tx = new TransactionTemplate(txManager);
        this.usdcMint = props.solana().usdcMint();
    }

    /** Carteiras Solana de freelancers (o que o watcher observa e o filtro aceita). */
    public List<String> freelancerSolanaWallets() {
        return users.findBySolanaWalletIsNotNull().stream()
                .filter(u -> u.getRole() == Role.FREELANCER)
                .map(User::getSolanaWallet)
                .distinct()
                .toList();
    }

    public List<Outcome> processBatch(List<DetectedTransfer> transfers) {
        Set<String> wallets = new HashSet<>(freelancerSolanaWallets());
        var outcomes = new ArrayList<Outcome>(transfers.size());
        for (var t : transfers) {
            outcomes.add(processSafely(t, wallets));
        }
        return outcomes;
    }

    private Outcome processSafely(DetectedTransfer t, Set<String> wallets) {
        try {
            return tx.execute(s -> process(t, wallets));
        } catch (DataIntegrityViolationException e) {
            // Corrida na unique (network, txHash, logIndex): outra requisição gravou primeiro.
            log.info("transfer {}#{} already recorded concurrently", t == null ? null : t.txHash(),
                    t == null ? null : t.logIndex());
            return Outcome.DUPLICATE;
        } catch (RuntimeException e) {
            log.error("failed to process transfer {}: {}", t == null ? null : t.txHash(), e.toString(), e);
            return Outcome.FAILED;
        }
    }

    private Outcome process(DetectedTransfer t, Set<String> wallets) {
        // 1. Filtro: só USDC (Solana, MVP) para a carteira de algum freelancer.
        if (t == null || t.network() != Network.SOLANA || t.txHash() == null || t.toAddress() == null
                || t.blockTime() == null || t.amount() == null) {
            return Outcome.IGNORED;
        }
        if (!TransferFilter.isRelevant(t.token(), usdcMint, t.toAddress(), wallets)) return Outcome.IGNORED;
        var amount = parseAmount(t.amount());
        if (amount == null) return Outcome.IGNORED;
        var freelancer = users.findBySolanaWallet(t.toAddress()).filter(u -> u.getRole() == Role.FREELANCER).orElse(null);
        if (freelancer == null) return Outcome.IGNORED;

        // Serializa com outras operações nas faturas deste freelancer (inclusive reenvios simultâneos).
        invoices.lockFreelancer(freelancer.getId());

        // 2. Idempotência
        int logIndex = t.logIndex() == null ? 0 : t.logIndex();
        if (payments.existsByNetworkAndTxHashAndLogIndex(t.network(), t.txHash(), logIndex)) return Outcome.DUPLICATE;

        // 4. Persistir como DETECTED (flush: a unique estoura aqui se houver corrida)
        var payment = payments.saveAndFlush(new Payment(t.network(), t.txHash(), logIndex,
                t.fromAddress() == null ? "" : t.fromAddress(), t.toAddress(), amount, t.blockTime(), freelancer.getId()));

        // 5–6. Matching
        var all = invoices.findByFreelancerIdAndNetwork(freelancer.getId(), t.network());
        var decision = Matcher.match(
                new IncomingTransfer(t.network(), t.toAddress(), amount, t.references(), t.contractInvoiceId()),
                all.stream().map(Invoice::snapshot).toList());

        if (decision.status() == PaymentStatus.MATCHED) {
            Map<UUID, Invoice> byId = all.stream().collect(Collectors.toMap(Invoice::getId, Function.identity()));
            // 7. Aplicar
            applyMatch(payment, byId.get(decision.invoiceId()), decision.method(), freelancer);
            return Outcome.MATCHED;
        }
        payment.setStatus(decision.status());
        payment.setUnmatchedReason(decision.reason());
        return decision.status() == PaymentStatus.AMBIGUOUS ? Outcome.AMBIGUOUS : Outcome.UNMATCHED;
    }

    /**
     * Passo 7 (também usado no match manual): amountPaid += amount, recalcula status, grava eventos e calcula BRL.
     * Precisa rodar dentro de uma transação, com o lock do freelancer.
     */
    public void applyMatch(Payment payment, Invoice invoice, MatchMethod method, User freelancer) {
        var before = invoice.getStatus();
        var result = Matcher.apply(invoice.snapshot(), payment.getAmount());
        invoice.setAmountPaid(result.amountPaid());
        invoice.setStatus(result.status());

        payment.setInvoiceId(invoice.getId());
        payment.setMatchMethod(method);
        payment.setStatus(PaymentStatus.MATCHED);
        payment.setUnmatchedReason(null);
        fx.applyFx(payment, freelancer.getFxRule());

        var payload = new LinkedHashMap<String, Object>();
        payload.put("paymentId", payment.getId().toString());
        payload.put("txHash", payment.getTxHash());
        payload.put("amount", payment.getAmount().toPlainString());
        payload.put("method", method.name());
        payload.put("amountPaid", result.amountPaid().toPlainString());
        payload.put("balance", result.balance().toPlainString());
        payload.put("excess", result.excess().toPlainString());
        if (payment.getAmountBrl() != null) payload.put("amountBrl", payment.getAmountBrl().toPlainString());
        var type = method == MatchMethod.MANUAL ? InvoiceEvent.MANUAL_MATCH : InvoiceEvent.PAYMENT_MATCHED;
        events.save(new InvoiceEvent(invoice.getId(), type, payload));
        if (before != result.status()) {
            events.save(new InvoiceEvent(invoice.getId(), InvoiceEvent.STATUS_CHANGED,
                    Map.of("from", before.name(), "to", result.status().name())));
        }
    }

    /** Valor USDC positivo com até 6 casas; qualquer outra coisa é ignorada. */
    static BigDecimal parseAmount(String raw) {
        try {
            var v = new BigDecimal(raw.trim());
            if (v.signum() <= 0) return null;
            return v.setScale(6, RoundingMode.UNNECESSARY);
        } catch (NumberFormatException | ArithmeticException e) {
            return null;
        }
    }
}
