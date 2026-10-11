package com.paytrail.payment;

import com.paytrail.common.Enums.Network;
import com.paytrail.reconciliation.Reconciliation.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    boolean existsByNetworkAndTxHashAndLogIndex(Network network, String txHash, int logIndex);

    List<Payment> findByFreelancerIdOrderByBlockTimeDesc(UUID freelancerId);

    List<Payment> findByFreelancerIdAndStatusOrderByBlockTimeDesc(UUID freelancerId, PaymentStatus status);

    List<Payment> findByInvoiceIdOrderByBlockTimeAsc(UUID invoiceId);

    /** Pagamentos conciliados num intervalo [from, to) — base do relatório mensal. */
    List<Payment> findByFreelancerIdAndStatusAndBlockTimeGreaterThanEqualAndBlockTimeLessThanOrderByBlockTimeAsc(
            UUID freelancerId, PaymentStatus status, Instant from, Instant to);

    /** Conciliados sem BRL (cotação falhou) para o job de nova tentativa. */
    List<Payment> findByStatusAndAmountBrlIsNull(PaymentStatus status);

    @Query("""
            select coalesce(sum(p.amount), 0) from Payment p
            where p.freelancerId = :freelancerId and p.status = com.paytrail.reconciliation.Reconciliation.PaymentStatus.MATCHED
              and p.blockTime >= :from and p.blockTime < :to""")
    BigDecimal sumMatchedUsdc(@Param("freelancerId") UUID freelancerId, @Param("from") Instant from, @Param("to") Instant to);

    @Query("""
            select coalesce(sum(p.amountBrl), 0) from Payment p
            where p.freelancerId = :freelancerId and p.status = com.paytrail.reconciliation.Reconciliation.PaymentStatus.MATCHED
              and p.blockTime >= :from and p.blockTime < :to""")
    BigDecimal sumMatchedBrl(@Param("freelancerId") UUID freelancerId, @Param("from") Instant from, @Param("to") Instant to);

    @Query("""
            select count(p) from Payment p
            where p.freelancerId = :freelancerId
              and p.status in (com.paytrail.reconciliation.Reconciliation.PaymentStatus.UNMATCHED,
                               com.paytrail.reconciliation.Reconciliation.PaymentStatus.AMBIGUOUS)
              and p.blockTime >= :from and p.blockTime < :to""")
    long countUnmatched(@Param("freelancerId") UUID freelancerId, @Param("from") Instant from, @Param("to") Instant to);
}
