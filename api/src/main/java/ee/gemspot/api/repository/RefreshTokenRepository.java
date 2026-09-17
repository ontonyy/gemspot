package ee.gemspot.api.repository;

import ee.gemspot.api.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByJti(String jti);
    List<RefreshToken> findByFamilyId(String familyId);
    List<RefreshToken> findByUserId(String userId);

    /**
     * Atomically claim an unused token: marks it used only if it is still unused,
     * returning the number of rows changed (1 = this caller won the rotation,
     * 0 = another request already rotated it, or it doesn't exist). This — not the
     * read of {@code used} — is the reuse-detection boundary: a read-then-write would
     * let two concurrent refreshes of the same jti both succeed.
     * Self-transactional for the same reason as deleteByFamilyId: AuthService.refresh
     * runs without a surrounding transaction.
     */
    @Transactional
    @Modifying
    @Query("update RefreshToken t set t.used = true where t.jti = :jti and t.used = false")
    int markUsedIfUnused(@Param("jti") String jti);

    // Self-transactional: AuthService.refresh runs without a surrounding tx so the
    // family-revoke commits before the 401 is thrown (D4 reuse detection).
    @Transactional
    @Modifying
    void deleteByFamilyId(String familyId);

    @Transactional
    @Modifying
    void deleteByUserId(String userId);
}
