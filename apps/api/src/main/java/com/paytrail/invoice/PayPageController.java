package com.paytrail.invoice;

import com.paytrail.common.Enums.Network;
import com.paytrail.common.Money;
import com.paytrail.config.PayTrailProperties;
import com.paytrail.invoice.InvoiceDtos.PayPageDto;
import com.paytrail.user.User;
import com.paytrail.user.UserRepository;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** Página pública de pagamento (sem login). */
@RestController
public class PayPageController {

    private final InvoiceRepository invoices;
    private final UserRepository users;
    private final String usdcMint;

    public PayPageController(InvoiceRepository invoices, UserRepository users, PayTrailProperties props) {
        this.invoices = invoices;
        this.users = users;
        this.usdcMint = props.solana().usdcMint();
    }

    @GetMapping("/pay/{publicId}")
    @Transactional(readOnly = true)
    public PayPageDto get(@PathVariable String publicId) {
        var invoice = invoices.findByPublicId(publicId.trim().toUpperCase()).orElseThrow(InvoiceService::notFound);
        var freelancerName = users.findById(invoice.getFreelancerId()).map(User::getName).orElse(null);
        var amountToSend = invoice.balance();
        String solanaPayUrl = null;
        if (invoice.getNetwork() == Network.SOLANA && InvoiceService.OPEN_STATUSES.contains(invoice.getStatus())
                && amountToSend.signum() > 0) {
            solanaPayUrl = solanaPayUrl(invoice.getRecipientAddress(), Money.plain(amountToSend), usdcMint,
                    invoice.getReference(), invoice.getPublicId());
        }
        return new PayPageDto(invoice.getPublicId(), freelancerName, invoice.getClientName(), invoice.getDescription(),
                invoice.getNetwork(), invoice.getRecipientAddress(), Money.usdc(amountToSend), invoice.getStatus(),
                solanaPayUrl, null, null);
    }

    /** Solana Pay transfer request (specs/04-onchain.md). */
    static String solanaPayUrl(String recipient, String amount, String mint, String reference, String publicId) {
        var sb = new StringBuilder("solana:").append(recipient)
                .append("?amount=").append(enc(amount))
                .append("&spl-token=").append(enc(mint));
        if (reference != null) sb.append("&reference=").append(enc(reference));
        sb.append("&label=").append(enc("PayTrail"))
                .append("&message=").append(enc(publicId));
        return sb.toString();
    }

    private static String enc(String v) {
        return URLEncoder.encode(v, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
