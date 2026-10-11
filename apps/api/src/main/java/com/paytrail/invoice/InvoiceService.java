package com.paytrail.invoice;

import com.paytrail.common.ApiException;
import com.paytrail.common.Base58;
import com.paytrail.common.Enums.Network;
import com.paytrail.invoice.InvoiceDtos.CreateInvoiceRequest;
import com.paytrail.reconciliation.Reconciliation.InvoiceStatus;
import com.paytrail.reconciliation.UniqueSuffixAllocator;
import com.paytrail.user.User;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Criação e ciclo de vida das faturas (specs/01-dominio.md, specs/02-conciliacao.md §1). */
@Service
public class InvoiceService {

    static final EnumSet<InvoiceStatus> OPEN_STATUSES = EnumSet.of(InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID);

    /** Sem 0/O, 1/I/L: legível e sem ambiguidade. */
    private static final String PUBLIC_ID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final InvoiceRepository invoices;
    private final InvoiceEventRepository events;

    public InvoiceService(InvoiceRepository invoices, InvoiceEventRepository events) {
        this.invoices = invoices;
        this.events = events;
    }

    @Transactional
    public Invoice create(User freelancer, CreateInvoiceRequest req) {
        if (req.network() != Network.SOLANA) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "NETWORK_NOT_SUPPORTED", "only SOLANA is supported");
        }
        var wallet = freelancer.getSolanaWallet();
        if (wallet == null || wallet.isBlank()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "WALLET_NOT_SET", "set your Solana wallet before creating invoices");
        }
        var base = parseBaseAmount(req.baseAmount());

        invoices.lockFreelancer(freelancer.getId());
        var used = invoices.findByNetworkAndRecipientAddressAndStatusIn(Network.SOLANA, wallet, OPEN_STATUSES).stream()
                .map(i -> i.getUniqueAmount().subtract(i.getBaseAmount()))
                .toList();
        var unique = UniqueSuffixAllocator.allocate(base, used, RANDOM)
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "NO_UNIQUE_SUFFIX",
                        "too many open invoices for this wallet; settle or cancel some first"));

        var invoice = new Invoice(newPublicId(), freelancer.getId(), req.clientName().trim(),
                blankToNull(req.clientEmail()), req.description().trim(), Network.SOLANA, wallet, base, unique,
                Base58.randomSolanaReference(), req.dueDate());
        invoices.save(invoice);
        var payload = new LinkedHashMap<String, Object>();
        payload.put("baseAmount", base.toPlainString());
        payload.put("uniqueAmount", unique.toPlainString());
        payload.put("network", Network.SOLANA.name());
        events.save(new InvoiceEvent(invoice.getId(), InvoiceEvent.CREATED, payload));
        return invoice;
    }

    @Transactional(readOnly = true)
    public List<Invoice> list(UUID freelancerId, InvoiceStatus status) {
        return status == null
                ? invoices.findByFreelancerIdOrderByCreatedAtDesc(freelancerId)
                : invoices.findByFreelancerIdAndStatusOrderByCreatedAtDesc(freelancerId, status);
    }

    /** Fatura do próprio freelancer; 404 para qualquer outra (não revela existência). */
    @Transactional(readOnly = true)
    public Invoice getOwned(UUID freelancerId, UUID invoiceId) {
        return invoices.findById(invoiceId)
                .filter(i -> i.getFreelancerId().equals(freelancerId))
                .orElseThrow(InvoiceService::notFound);
    }

    @Transactional
    public Invoice cancel(UUID freelancerId, UUID invoiceId) {
        invoices.lockFreelancer(freelancerId);
        var invoice = getOwned(freelancerId, invoiceId);
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) return invoice;
        if (invoice.getAmountPaid().signum() > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "INVOICE_HAS_PAYMENTS", "invoices with payments cannot be cancelled");
        }
        var from = invoice.getStatus();
        invoice.setStatus(InvoiceStatus.CANCELLED);
        invoice.setCancelledAt(Instant.now());
        events.save(new InvoiceEvent(invoice.getId(), InvoiceEvent.CANCELLED, Map.of("from", from.name())));
        return invoice;
    }

    static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "invoice not found");
    }

    /** baseAmount > 0 com no máximo 2 casas (o sufixo único ocupa os centavos). */
    static BigDecimal parseBaseAmount(String raw) {
        BigDecimal v;
        try {
            v = new BigDecimal(raw.trim());
        } catch (NumberFormatException | NullPointerException e) {
            throw invalidAmount();
        }
        if (v.signum() <= 0 || v.stripTrailingZeros().scale() > 2 || v.compareTo(new BigDecimal("1000000000000")) >= 0) {
            throw invalidAmount();
        }
        return v.setScale(6);
    }

    private static ApiException invalidAmount() {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_AMOUNT", "baseAmount must be a positive number with at most 2 decimals");
    }

    private String newPublicId() {
        for (int attempt = 0; attempt < 20; attempt++) {
            var sb = new StringBuilder("INV-");
            for (int i = 0; i < 6; i++) sb.append(PUBLIC_ID_ALPHABET.charAt(RANDOM.nextInt(PUBLIC_ID_ALPHABET.length())));
            var id = sb.toString();
            if (!invoices.existsByPublicId(id)) return id;
        }
        throw new IllegalStateException("could not allocate a unique publicId");
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
