package ee.gemspot.api.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * email_change_tokens — net-new table backing the verified email-change flow.
 * The PK {@code token} is the opaque secret carried in the verification link
 * (UUID, assigned in code). A row records the requested {@code new_email}; on
 * verify, {@code User.email} is swapped and the row is marked {@code used}.
 * One ACTIVE (unused, unexpired) row per user is enforced by the service
 * (it deletes prior tokens before issuing a new one). snake_case columns.
 */
@Entity
@Table(name = "email_change_tokens")
public class EmailChangeToken {

    @Id
    @Column(name = "token")
    private String token; // opaque secret, assigned in code

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "new_email", nullable = false)
    private String newEmail;

    @Column(name = "used", nullable = false)
    private boolean used = false;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getNewEmail() { return newEmail; }
    public void setNewEmail(String newEmail) { this.newEmail = newEmail; }

    public boolean isUsed() { return used; }
    public void setUsed(boolean used) { this.used = used; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public Instant getCreatedAt() { return createdAt; }
}
