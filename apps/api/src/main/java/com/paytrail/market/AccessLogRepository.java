package com.paytrail.market;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccessLogRepository extends JpaRepository<AccessLog, UUID> {

    List<AccessLog> findByAccountantIdAndFreelancerIdOrderByCreatedAtDesc(UUID accountantId, UUID freelancerId);
}
