package com.paytrail.market;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "messages")
public class Message {

    public enum Type { TEXT, PROPOSAL, SYSTEM }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "conversation_id", nullable = false, updatable = false)
    private UUID conversationId;

    /** null em mensagens SYSTEM. */
    @Column(name = "sender_id", updatable = false)
    private UUID senderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Type type;

    @Column(nullable = false, updatable = false)
    private String body;

    @Column(name = "proposal_id", updatable = false)
    private UUID proposalId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Message() {}

    public Message(UUID conversationId, UUID senderId, Type type, String body, UUID proposalId) {
        this.conversationId = conversationId;
        this.senderId = senderId;
        this.type = type;
        this.body = body;
        this.proposalId = proposalId;
    }

    public UUID getId() { return id; }
    public UUID getConversationId() { return conversationId; }
    public UUID getSenderId() { return senderId; }
    public Type getType() { return type; }
    public String getBody() { return body; }
    public UUID getProposalId() { return proposalId; }
    public Instant getCreatedAt() { return createdAt; }
}
