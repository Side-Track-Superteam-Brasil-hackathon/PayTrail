package com.paytrail.invoice;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.paytrail.common.Enums.Network;
import com.paytrail.common.Money;
import com.paytrail.payment.PaymentDto;
import com.paytrail.reconciliation.Reconciliation.InvoiceStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** DTOs de fatura (schemas Invoice, InvoiceEvent e a página pública /pay em specs/03-api.yaml). */
public final class InvoiceDtos {

    private InvoiceDtos() {}

    public record CreateInvoiceRequest(
            @NotBlank String clientName,
            String clientEmail,
            @NotBlank String description,
            @NotNull Network network,
            @NotBlank String baseAmount,
            @NotNull LocalDate dueDate) {}

    public record InvoiceDto(
            UUID id,
            String publicId,
            String clientName,
            String clientEmail,
            String description,
            Network network,
            String recipientAddress,
            String baseAmount,
            String uniqueAmount,
            String amountPaid,
            String balance,
            String excess,
            LocalDate dueDate,
            boolean overdue,
            InvoiceStatus status,
            String payUrl,
            Instant createdAt) {

        public static InvoiceDto of(Invoice i, String publicWebUrl, LocalDate today) {
            return new InvoiceDto(i.getId(), i.getPublicId(), i.getClientName(), i.getClientEmail(), i.getDescription(),
                    i.getNetwork(), i.getRecipientAddress(), Money.usdc(i.getBaseAmount()), Money.usdc(i.getUniqueAmount()),
                    Money.usdc(i.getAmountPaid()), Money.usdc(i.balance()), Money.usdc(i.excess()), i.getDueDate(),
                    i.isOverdue(today), i.getStatus(), InvoiceDtos.payUrl(publicWebUrl, i.getPublicId()), i.getCreatedAt());
        }
    }

    public static String payUrl(String publicWebUrl, String publicId) {
        var base = publicWebUrl == null ? "" : publicWebUrl.replaceAll("/+$", "");
        return base + "/pay/" + publicId;
    }

    public record InvoiceEventDto(String type, Map<String, Object> payload, Instant createdAt) {

        public static InvoiceEventDto of(InvoiceEvent e) {
            return new InvoiceEventDto(e.getType(), e.getPayload(), e.getCreatedAt());
        }
    }

    /** GET /invoices/{id}: Invoice + payments + events (allOf no contrato). */
    public record InvoiceDetailDto(
            @JsonUnwrapped InvoiceDto invoice,
            List<PaymentDto> payments,
            List<InvoiceEventDto> events) {}

    /** GET /pay/{publicId}: dados públicos da página de pagamento. */
    public record PayPageDto(
            String publicId,
            String freelancerName,
            String clientName,
            String description,
            Network network,
            String recipientAddress,
            String amountToSend,
            InvoiceStatus status,
            String solanaPayUrl,
            String arcContract,
            String arcInvoiceId) {}
}
