package com.paytrail.invoice;

import com.paytrail.common.Enums.Network;
import com.paytrail.reconciliation.Reconciliation.InvoiceStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Optional<Invoice> findByPublicId(String publicId);

    List<Invoice> findByFreelancerIdOrderByCreatedAtDesc(UUID freelancerId);

    List<Invoice> findByFreelancerIdAndStatusOrderByCreatedAtDesc(UUID freelancerId, InvoiceStatus status);

    /** Todas as faturas do freelancer na rede (entrada do Matcher). */
    List<Invoice> findByFreelancerIdAndNetwork(UUID freelancerId, Network network);

    /** Faturas abertas de uma carteira (para sortear sufixo único). */
    List<Invoice> findByNetworkAndRecipientAddressAndStatusIn(Network network, String recipientAddress,
                                                              Collection<InvoiceStatus> statuses);

    /** Faturas abertas de uma rede (para o watcher observar as references). */
    List<Invoice> findByNetworkAndStatusIn(Network network, Collection<InvoiceStatus> statuses);
}
