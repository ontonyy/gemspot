package ee.gemspot.api.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * refresh_tokens (D4) — net-new, not in Prisma schema. Backs refresh-token reuse
 * detection: jti is PK, rotated per refresh; replay of a used jti within a family
 * kills the family (Block 5 logic). snake_case columns (net-new table).
 */
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

    @Id
    @Column(name = "jti")
    private String jti; // assigned in code (token id), NOT generated

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "family_id", nullable = false)
    private String familyId;

    @Column(name = "used", nullable = false)
    private boolean used = false;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public String getJti() { return jti; }
    public void setJti(String jti) { this.jti = jti; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getFamilyId() { return familyId; }
    public void setFamilyId(String familyId) { this.familyId = familyId; }

    public boolean isUsed() { return used; }
    public void setUsed(boolean used) { this.used = used; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public Instant getCreatedAt() { return createdAt; }
}
