package com.paytrail.market;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    Optional<Conversation> findByUserAIdAndUserBId(UUID userAId, UUID userBId);

    @Query("select c from Conversation c where c.userAId = :userId or c.userBId = :userId order by c.lastMessageAt desc")
    List<Conversation> findForUser(@Param("userId") UUID userId);
}
