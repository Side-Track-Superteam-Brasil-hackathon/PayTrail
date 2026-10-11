package com.paytrail.invoice;

import com.paytrail.auth.CurrentUser;
import com.paytrail.common.Dates;
import com.paytrail.common.Enums.Role;
import com.paytrail.common.ExplorerLinks;
import com.paytrail.config.PayTrailProperties;
import com.paytrail.invoice.InvoiceDtos.CreateInvoiceRequest;
import com.paytrail.invoice.InvoiceDtos.InvoiceDetailDto;
import com.paytrail.invoice.InvoiceDtos.InvoiceDto;
import com.paytrail.invoice.InvoiceDtos.InvoiceEventDto;
import com.paytrail.payment.PaymentDto;
import com.paytrail.payment.PaymentRepository;
import com.paytrail.reconciliation.Reconciliation.InvoiceStatus;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/invoices")
public class InvoiceController {

    private final CurrentUser currentUser;
    private final InvoiceService service;
    private final PaymentRepository payments;
    private final InvoiceEventRepository events;
    private final ExplorerLinks links;
    private final String publicWebUrl;

    public InvoiceController(CurrentUser currentUser, InvoiceService service, PaymentRepository payments,
                             InvoiceEventRepository events, ExplorerLinks links, PayTrailProperties props) {
        this.currentUser = currentUser;
        this.service = service;
        this.payments = payments;
        this.events = events;
        this.links = links;
        this.publicWebUrl = props.publicWebUrl();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InvoiceDto create(@Valid @RequestBody CreateInvoiceRequest req) {
        var freelancer = currentUser.require(Role.FREELANCER);
        return toDto(service.create(freelancer, req));
    }

    @GetMapping
    public List<InvoiceDto> list(@RequestParam(required = false) InvoiceStatus status) {
        var freelancer = currentUser.require(Role.FREELANCER);
        var today = Dates.todayBrt();
        return service.list(freelancer.getId(), status).stream()
                .map(i -> InvoiceDto.of(i, publicWebUrl, today))
                .toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public InvoiceDetailDto get(@PathVariable UUID id) {
        var invoice = service.getOwned(currentUser.id(), id);
        var paymentDtos = payments.findByInvoiceIdOrderByBlockTimeAsc(invoice.getId()).stream()
                .map(p -> PaymentDto.of(p, links))
                .toList();
        var eventDtos = events.findByInvoiceIdOrderByCreatedAtAsc(invoice.getId()).stream()
                .map(InvoiceEventDto::of)
                .toList();
        return new InvoiceDetailDto(toDto(invoice), paymentDtos, eventDtos);
    }

    @PostMapping("/{id}/cancel")
    public InvoiceDto cancel(@PathVariable UUID id) {
        var freelancer = currentUser.require(Role.FREELANCER);
        return toDto(service.cancel(freelancer.getId(), id));
    }

    private InvoiceDto toDto(Invoice invoice) {
        return InvoiceDto.of(invoice, publicWebUrl, Dates.todayBrt());
    }
}
