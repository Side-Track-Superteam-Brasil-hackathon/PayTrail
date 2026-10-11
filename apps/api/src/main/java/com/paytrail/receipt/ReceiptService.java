package com.paytrail.receipt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.paytrail.common.ExplorerLinks;
import com.paytrail.common.Money;
import com.paytrail.invoice.Invoice;
import com.paytrail.invoice.InvoiceEvent;
import com.paytrail.invoice.InvoiceEventRepository;
import com.paytrail.payment.PaymentRepository;
import com.paytrail.reconciliation.Reconciliation.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Comprovante verificável (specs/02-conciliacao.md §4). */
@Service
public class ReceiptService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final ReceiptRepository receipts;
    private final PaymentRepository payments;
    private final InvoiceEventRepository events;
    private final ExplorerLinks links;

    public ReceiptService(ReceiptRepository receipts, PaymentRepository payments, InvoiceEventRepository events,
                          ExplorerLinks links) {
        this.receipts = receipts;
        this.payments = payments;
        this.events = events;
        this.links = links;
    }

    @Transactional
    public Receipt generate(Invoice invoice) {
        var canonical = CanonicalJson.canonicalize(document(invoice, Instant.now().truncatedTo(ChronoUnit.MILLIS)));
        var sha = CanonicalJson.sha256Hex(canonical);
        var receipt = receipts.findBySha256(sha).orElseGet(() -> receipts.save(new Receipt(invoice.getId(), canonical, sha)));
        events.save(new InvoiceEvent(invoice.getId(), InvoiceEvent.RECEIPT_GENERATED,
                Map.of("receiptId", receipt.getId().toString(), "sha256", sha)));
        return receipt;
    }

    /** Conteúdo do comprovante; todos os valores são strings (ou null). */
    ObjectNode document(Invoice invoice, Instant generatedAt) {
        var root = MAPPER.createObjectNode();
        root.put("type", "paytrail.receipt");
        root.put("version", "1");
        root.put("generatedAt", generatedAt.toString());
        root.putArray("assumptions").add("1 USDC = 1 USD");

        var inv = root.putObject("invoice");
        inv.put("publicId", invoice.getPublicId());
        inv.put("clientName", invoice.getClientName());
        inv.put("description", invoice.getDescription());
        inv.put("network", invoice.getNetwork().name());
        inv.put("recipientAddress", invoice.getRecipientAddress());
        inv.put("baseAmount", Money.usdc(invoice.getBaseAmount()));
        inv.put("uniqueAmount", Money.usdc(invoice.getUniqueAmount()));
        inv.put("amountPaid", Money.usdc(invoice.getAmountPaid()));
        inv.put("status", invoice.getStatus().name());
        inv.put("dueDate", invoice.getDueDate().toString());

        var list = root.putArray("payments");
        var totalUsdc = BigDecimal.ZERO;
        var totalBrl = BigDecimal.ZERO;
        boolean brlComplete = true;
        for (var p : payments.findByInvoiceIdOrderByBlockTimeAsc(invoice.getId())) {
            if (p.getStatus() != PaymentStatus.MATCHED) continue;
            var n = list.addObject();
            n.put("txHash", p.getTxHash());
            n.put("explorerUrl", links.tx(p.getNetwork(), p.getTxHash()));
            n.put("network", p.getNetwork().name());
            n.put("fromAddress", p.getFromAddress());
            n.put("amount", Money.usdc(p.getAmount()));
            n.put("blockTime", p.getBlockTime().toString());
            n.put("matchMethod", p.getMatchMethod() == null ? null : p.getMatchMethod().name());
            n.put("fxRule", p.getFxRule() == null ? null : p.getFxRule().name());
            n.put("fxDate", p.getFxDate() == null ? null : p.getFxDate().toString());
            n.put("fxRate", Money.rate(p.getFxRate()));
            n.put("amountBrl", Money.brl(p.getAmountBrl()));
            totalUsdc = totalUsdc.add(p.getAmount());
            if (p.getAmountBrl() == null) brlComplete = false;
            else totalBrl = totalBrl.add(p.getAmountBrl());
        }
        var totals = root.putObject("totals");
        totals.put("usdc", Money.usdc(totalUsdc));
        totals.put("brl", brlComplete ? Money.brl(totalBrl) : null);
        return root;
    }

    public Optional<Receipt> findBySha256(String sha256) {
        return receipts.findBySha256(sha256.trim().toLowerCase());
    }

    public boolean exists(String sha256) {
        return findBySha256(sha256).isPresent();
    }
}
