package com.paytrail.market;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProposalRepository extends JpaRepository<Proposal, UUID> {

    boolean existsByConversationIdAndStatus(UUID conversationId, Proposal.Status status);

    Optional<Proposal> findFirstByConversationIdAndStatus(UUID conversationId, Proposal.Status status);
}
