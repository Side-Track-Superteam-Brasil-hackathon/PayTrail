package com.paytrail.invoice;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceEventRepository extends JpaRepository<InvoiceEvent, UUID> {

    List<InvoiceEvent> findByInvoiceIdOrderByCreatedAtAsc(UUID invoiceId);
}
