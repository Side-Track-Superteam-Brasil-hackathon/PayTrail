package com.paytrail.receipt;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReceiptRepository extends JpaRepository<Receipt, UUID> {

    Optional<Receipt> findBySha256(String sha256);

    List<Receipt> findByInvoiceIdOrderByCreatedAtDesc(UUID invoiceId);
}
