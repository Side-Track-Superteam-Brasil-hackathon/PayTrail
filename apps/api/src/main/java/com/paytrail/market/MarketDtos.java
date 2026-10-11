package com.paytrail.market;

import com.paytrail.user.UserDtos.PublicProfile;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** DTOs do marketplace (schemas Conversation, Message, Proposal, AccountantAccess em specs/03-api.yaml). */
public final class MarketDtos {

    private MarketDtos() {}

    public record OpenConversationRequest(UUID participantId) {}

    public record SendMessageRequest(String body) {}

    /** feeAmount é string decimal na API. */
    public record CreateProposalRequest(
            String feeAmount, Proposal.FeeCurrency feeCurrency, LocalDate periodStart, LocalDate periodEnd, String note) {}

    public record ProposalDto(
            UUID id, UUID senderId, UUID recipientId, UUID accountantId, UUID freelancerId,
            String feeAmount, Proposal.FeeCurrency feeCurrency, LocalDate periodStart, LocalDate periodEnd,
            String note, Proposal.Status status, Instant createdAt, Instant decidedAt) {

        public static ProposalDto of(Proposal p) {
            return new ProposalDto(p.getId(), p.getSenderId(), p.getRecipientId(), p.getAccountantId(),
                    p.getFreelancerId(), p.getFeeAmount().toPlainString(), p.getFeeCurrency(), p.getPeriodStart(),
                    p.getPeriodEnd(), p.getNote(), p.getStatus(), p.getCreatedAt(), p.getDecidedAt());
        }
    }

    public record MessageDto(
            UUID id, UUID conversationId, UUID senderId, Message.Type type, String body, ProposalDto proposal,
            Instant createdAt) {

        public static MessageDto of(Message m, ProposalDto proposal) {
            return new MessageDto(m.getId(), m.getConversationId(), m.getSenderId(), m.getType(), m.getBody(),
                    proposal, m.getCreatedAt());
        }
    }

    public record ConversationDto(UUID id, PublicProfile other, MessageDto lastMessage, Instant lastMessageAt) {}

    public record AccessDto(
            UUID id, PublicProfile accountant, PublicProfile freelancer, LocalDate periodStart, LocalDate periodEnd,
            AccountantAccess.Status status, Instant grantedAt, Instant revokedAt) {}

    public record AccessLogDto(AccessLog.Action action, Instant createdAt) {}

    public record ClientDto(
            PublicProfile freelancer, AccessDto access, String currentMonthUsdc, String currentMonthBrl,
            long unmatchedCount) {}
}
