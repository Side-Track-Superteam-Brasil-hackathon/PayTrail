package com.paytrail.user;

import com.paytrail.common.Enums.FxRule;
import com.paytrail.common.Enums.Role;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Role role;

    @Column(nullable = false)
    private String name;

    private String city;

    private String bio;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "text[]")
    private String[] specialties = new String[0];

    @Column(name = "solana_wallet")
    private String solanaWallet;

    @Column(name = "arc_wallet")
    private String arcWallet;

    @Enumerated(EnumType.STRING)
    @Column(name = "fx_rule", nullable = false)
    private FxRule fxRule = FxRule.CARNE_LEAO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected User() {}

    public User(String email, String passwordHash, Role role, String name) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.name = name;
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public Role getRole() { return role; }
    public String getName() { return name; }
    public String getCity() { return city; }
    public String getBio() { return bio; }
    public String[] getSpecialties() { return specialties; }
    public String getSolanaWallet() { return solanaWallet; }
    public String getArcWallet() { return arcWallet; }
    public FxRule getFxRule() { return fxRule; }
    public Instant getCreatedAt() { return createdAt; }

    public void setName(String name) { this.name = name; }
    public void setCity(String city) { this.city = city; }
    public void setBio(String bio) { this.bio = bio; }
    public void setSpecialties(String[] specialties) { this.specialties = specialties; }
    public void setSolanaWallet(String solanaWallet) { this.solanaWallet = solanaWallet; }
    public void setArcWallet(String arcWallet) { this.arcWallet = arcWallet; }
    public void setFxRule(FxRule fxRule) { this.fxRule = fxRule; }
}
