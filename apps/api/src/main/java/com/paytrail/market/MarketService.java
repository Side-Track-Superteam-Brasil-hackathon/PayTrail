package com.paytrail.market;

import com.paytrail.common.ApiException;
import com.paytrail.common.Enums.Role;
import com.paytrail.market.MarketDtos.AccessDto;
import com.paytrail.market.MarketDtos.AccessLogDto;
import com.paytrail.market.MarketDtos.ClientDto;
import com.paytrail.market.MarketDtos.ConversationDto;
import com.paytrail.market.MarketDtos.CreateProposalRequest;
import com.paytrail.market.MarketDtos.MessageDto;
import com.paytrail.market.MarketDtos.ProposalDto;
import com.paytrail.payment.PaymentRepository;
import com.paytrail.user.User;
import com.paytrail.user.UserDtos.PublicProfile;
import com.paytrail.user.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Inbox, propostas e acessos (specs/06-marketplace.md). */
@Service
public class MarketService {

    private static final ZoneId SAO_PAULO = ZoneId.of("America/Sao_Paulo");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("MMM d", Locale.ENGLISH);
    private static final DateTimeFormatter DAY_YEAR = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH);
    private static final int MAX_BODY = 4000;

    private final UserRepository users;
    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final ProposalRepository proposals;
    private final AccountantAccessRepository accesses;
    private final AccessLogRepository logs;
    private final PaymentRepository payments;

    public MarketService(UserRepository users, ConversationRepository conversations, MessageRepository messages,
                         ProposalRepository proposals, AccountantAccessRepository accesses, AccessLogRepository logs,
                         PaymentRepository payments) {
        this.users = users;
        this.conversations = conversations;
        this.messages = messages;
        this.proposals = proposals;
        this.accesses = accesses;
        this.logs = logs;
        this.payments = payments;
    }

    // ---------- Inbox ----------

    @Transactional
    public ConversationDto openConversation(User me, UUID participantId) {
        if (participantId == null) throw validation("participantId is required");
        if (participantId.equals(me.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SELF_CONVERSATION", "cannot talk to yourself");
        }
        var other = users.findById(participantId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "user not found"));
        var probe = Conversation.between(me.getId(), other.getId());
        var conv = conversations.findByUserAIdAndUserBId(probe.getUserAId(), probe.getUserBId())
                .orElseGet(() -> conversations.save(probe));
        return toDto(conv, me.getId());
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> listConversations(User me) {
        return conversations.findForUser(me.getId()).stream().map(c -> toDto(c, me.getId())).toList();
    }

    @Transactional(readOnly = true)
    public List<MessageDto> listMessages(User me, UUID conversationId, Instant after) {
        var conv = participantConversation(me, conversationId);
        var list = after == null
                ? messages.findByConversationIdOrderByCreatedAtAsc(conv.getId())
                : messages.findByConversationIdAndCreatedAtAfterOrderByCreatedAtAsc(conv.getId(), after);
        return toMessageDtos(list);
    }

    @Transactional
    public MessageDto sendMessage(User me, UUID conversationId, String body) {
        var conv = participantConversation(me, conversationId);
        if (body == null || body.isBlank()) throw validation("body is required");
        if (body.length() > MAX_BODY) throw validation("body must have at most " + MAX_BODY + " characters");
        var msg = messages.save(new Message(conv.getId(), me.getId(), Message.Type.TEXT, body, null));
        conv.setLastMessageAt(msg.getCreatedAt());
        return MessageDto.of(msg, null);
    }

    // ---------- Propostas ----------

    @Transactional
    public ProposalDto createProposal(User me, UUID conversationId, CreateProposalRequest req) {
        var conv = participantConversation(me, conversationId);
        var other = users.findById(conv.otherParticipant(me.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "user not found"));
        if (me.getRole() == other.getRole()) {
            throw new ApiException(HttpStatus.CONFLICT, "ROLES_INVALID",
                    "proposals are only allowed between one freelancer and one accountant");
        }
        if (req.feeAmount() == null || req.feeCurrency() == null || req.periodStart() == null || req.periodEnd() == null) {
            throw validation("feeAmount, feeCurrency, periodStart and periodEnd are required");
        }
        BigDecimal fee;
        try {
            fee = new BigDecimal(req.feeAmount().trim());
        } catch (NumberFormatException e) {
            throw validation("feeAmount must be a decimal number");
        }
        if (fee.signum() < 0) throw validation("feeAmount must be >= 0");
        if (req.periodStart().isAfter(req.periodEnd())) throw validation("periodStart must be <= periodEnd");
        if (proposals.existsByConversationIdAndStatus(conv.getId(), Proposal.Status.SENT)) {
            throw new ApiException(HttpStatus.CONFLICT, "PROPOSAL_ALREADY_OPEN", "there is already an open proposal");
        }
        var accountant = me.getRole() == Role.ACCOUNTANT ? me : other;
        var freelancer = me.getRole() == Role.FREELANCER ? me : other;
        var p = proposals.save(new Proposal(conv.getId(), me.getId(), other.getId(), accountant.getId(),
                freelancer.getId(), fee.setScale(6, RoundingMode.HALF_UP), req.feeCurrency(),
                req.periodStart(), req.periodEnd(), req.note()));
        var msg = messages.save(new Message(conv.getId(), me.getId(), Message.Type.PROPOSAL, "Proposal sent", p.getId()));
        conv.setLastMessageAt(msg.getCreatedAt());
        return ProposalDto.of(p);
    }

    @Transactional
    public ProposalDto accept(User me, UUID proposalId) {
        var p = findProposal(proposalId);
        requireRecipient(me, p);
        requireOpen(p);
        p.decide(Proposal.Status.ACCEPTED);
        accesses.findByAccountantIdAndFreelancerIdAndStatus(p.getAccountantId(), p.getFreelancerId(),
                AccountantAccess.Status.ACTIVE).ifPresent(prev -> {
            prev.revoke();
            accesses.saveAndFlush(prev);
        });
        accesses.save(new AccountantAccess(p.getAccountantId(), p.getFreelancerId(), p.getId(),
                p.getPeriodStart(), p.getPeriodEnd()));
        var accountant = users.findById(p.getAccountantId()).orElseThrow();
        var freelancer = users.findById(p.getFreelancerId()).orElseThrow();
        systemMessage(p, "Proposal accepted — %s can now view %s's records from %s to %s.".formatted(
                firstName(accountant), firstName(freelancer), formatFrom(p), DAY_YEAR.format(p.getPeriodEnd())));
        return ProposalDto.of(p);
    }

    @Transactional
    public ProposalDto reject(User me, UUID proposalId) {
        var p = findProposal(proposalId);
        requireRecipient(me, p);
        requireOpen(p);
        p.decide(Proposal.Status.REJECTED);
        systemMessage(p, "Proposal rejected by " + firstName(me) + ".");
        return ProposalDto.of(p);
    }

    @Transactional
    public ProposalDto cancel(User me, UUID proposalId) {
        var p = findProposal(proposalId);
        if (!p.getSenderId().equals(me.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_SENDER", "only the sender can cancel");
        }
        requireOpen(p);
        p.decide(Proposal.Status.CANCELLED);
        systemMessage(p, "Proposal cancelled by " + firstName(me) + ".");
        return ProposalDto.of(p);
    }

    // ---------- Acesso ----------

    @Transactional(readOnly = true)
    public List<AccessDto> listAccess(User me) {
        var list = me.getRole() == Role.FREELANCER
                ? accesses.findByFreelancerIdOrderByGrantedAtDesc(me.getId())
                : accesses.findByAccountantIdOrderByGrantedAtDesc(me.getId());
        return toAccessDtos(list);
    }

    @Transactional
    public AccessDto revoke(User me, UUID accessId) {
        var a = ownedAccess(me, accessId);
        if (a.getStatus() != AccountantAccess.Status.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "ACCESS_NOT_ACTIVE", "access is already revoked");
        }
        a.revoke();
        return toAccessDtos(List.of(a)).get(0);
    }

    @Transactional(readOnly = true)
    public List<AccessLogDto> accessLogs(User me, UUID accessId) {
        var a = ownedAccess(me, accessId);
        return logs.findByAccountantIdAndFreelancerIdOrderByCreatedAtDesc(a.getAccountantId(), a.getFreelancerId())
                .stream().map(l -> new AccessLogDto(l.getAction(), l.getCreatedAt())).toList();
    }

    @Transactional(readOnly = true)
    public List<ClientDto> clients(User accountant) {
        var active = accesses.findByAccountantIdAndStatusOrderByGrantedAtDesc(accountant.getId(), AccountantAccess.Status.ACTIVE);
        var month = YearMonth.now(SAO_PAULO);
        var from = month.atDay(1).atStartOfDay(SAO_PAULO).toInstant();
        var to = month.plusMonths(1).atDay(1).atStartOfDay(SAO_PAULO).toInstant();
        return toAccessDtos(active).stream().map(a -> {
            var fid = a.freelancer().id();
            return new ClientDto(a.freelancer(), a,
                    payments.sumMatchedUsdc(fid, from, to).toPlainString(),
                    payments.sumMatchedBrl(fid, from, to).toPlainString(),
                    payments.countUnmatched(fid, from, to));
        }).toList();
    }

    // ---------- helpers ----------

    private Conversation participantConversation(User me, UUID id) {
        var conv = conversations.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "conversation not found"));
        if (!conv.hasParticipant(me.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_PARTICIPANT", "not a participant of this conversation");
        }
        return conv;
    }

    private Proposal findProposal(UUID id) {
        return proposals.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "proposal not found"));
    }

    private void requireRecipient(User me, Proposal p) {
        if (!p.getRecipientId().equals(me.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_RECIPIENT", "only the recipient can decide");
        }
    }

    private void requireOpen(Proposal p) {
        if (p.getStatus() != Proposal.Status.SENT) {
            throw new ApiException(HttpStatus.CONFLICT, "PROPOSAL_NOT_OPEN", "proposal is not open");
        }
    }

    private void systemMessage(Proposal p, String text) {
        var msg = messages.save(new Message(p.getConversationId(), null, Message.Type.SYSTEM, text, null));
        conversations.findById(p.getConversationId()).ifPresent(c -> c.setLastMessageAt(msg.getCreatedAt()));
    }

    private AccountantAccess ownedAccess(User me, UUID id) {
        var a = accesses.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "access not found"));
        if (!a.getFreelancerId().equals(me.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_OWNER", "only the freelancer owner can do this");
        }
        return a;
    }

    private ConversationDto toDto(Conversation c, UUID meId) {
        var other = users.findById(c.otherParticipant(meId)).orElseThrow();
        var last = messages.findFirstByConversationIdOrderByCreatedAtDesc(c.getId())
                .map(m -> toMessageDtos(List.of(m)).get(0)).orElse(null);
        return new ConversationDto(c.getId(), PublicProfile.of(other), last, c.getLastMessageAt());
    }

    private List<MessageDto> toMessageDtos(List<Message> list) {
        var ids = list.stream().map(Message::getProposalId).filter(Objects::nonNull).toList();
        Map<UUID, ProposalDto> byId = proposals.findAllById(ids).stream()
                .collect(Collectors.toMap(Proposal::getId, ProposalDto::of));
        return list.stream()
                .map(m -> MessageDto.of(m, m.getProposalId() == null ? null : byId.get(m.getProposalId())))
                .toList();
    }

    private List<AccessDto> toAccessDtos(List<AccountantAccess> list) {
        var ids = list.stream().flatMap(a -> Stream.of(a.getAccountantId(), a.getFreelancerId())).distinct().toList();
        Map<UUID, User> byId = users.findAllById(ids).stream().collect(Collectors.toMap(User::getId, Function.identity()));
        return list.stream().map(a -> new AccessDto(a.getId(), PublicProfile.of(byId.get(a.getAccountantId())),
                PublicProfile.of(byId.get(a.getFreelancerId())), a.getPeriodStart(), a.getPeriodEnd(), a.getStatus(),
                a.getGrantedAt(), a.getRevokedAt())).toList();
    }

    private static String firstName(User u) {
        var name = u.getName() == null ? "" : u.getName().trim();
        var i = name.indexOf(' ');
        return i < 0 ? name : name.substring(0, i);
    }

    private static String formatFrom(Proposal p) {
        return p.getPeriodStart().getYear() == p.getPeriodEnd().getYear()
                ? DAY.format(p.getPeriodStart()) : DAY_YEAR.format(p.getPeriodStart());
    }

    private static ApiException validation(String msg) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", msg);
    }
}
