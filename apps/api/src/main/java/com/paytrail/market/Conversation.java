package com.paytrail.market;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Conversa entre dois usuários. O par é guardado ordenado (userA < userB) para ser único. */
@Entity
@Table(name = "conversations")
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_a_id", nullable = false, updatable = false)
    private UUID userAId;

    @Column(name = "user_b_id", nullable = false, updatable = false)
    private UUID userBId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "last_message_at", nullable = false)
    private Instant lastMessageAt = Instant.now();

    protected Conversation() {}

    /** Cria a conversa já com o par ordenado. */
    public static Conversation between(UUID x, UUID y) {
        var c = new Conversation();
        if (x.toString().compareTo(y.toString()) < 0) {
            c.userAId = x;
            c.userBId = y;
        } else {
            c.userAId = y;
            c.userBId = x;
        }
        return c;
    }

    public boolean hasParticipant(UUID userId) {
        return userAId.equals(userId) || userBId.equals(userId);
    }

    public UUID otherParticipant(UUID userId) {
        return userAId.equals(userId) ? userBId : userAId;
    }

    public UUID getId() { return id; }
    public UUID getUserAId() { return userAId; }
    public UUID getUserBId() { return userBId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getLastMessageAt() { return lastMessageAt; }

    public void setLastMessageAt(Instant lastMessageAt) { this.lastMessageAt = lastMessageAt; }
}
