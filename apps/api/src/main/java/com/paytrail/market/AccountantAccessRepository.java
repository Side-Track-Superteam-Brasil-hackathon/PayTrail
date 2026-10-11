package com.paytrail.market;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountantAccessRepository extends JpaRepository<AccountantAccess, UUID> {

    Optional<AccountantAccess> findByAccountantIdAndFreelancerIdAndStatus(
            UUID accountantId, UUID freelancerId, AccountantAccess.Status status);

    List<AccountantAccess> findByAccountantIdAndStatusOrderByGrantedAtDesc(UUID accountantId, AccountantAccess.Status status);

    List<AccountantAccess> findByFreelancerIdOrderByGrantedAtDesc(UUID freelancerId);

    List<AccountantAccess> findByAccountantIdOrderByGrantedAtDesc(UUID accountantId);
}
