package ee.gemspot.api.repository;

import ee.gemspot.api.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByJti(String jti);
    List<RefreshToken> findByFamilyId(String familyId);

    // Self-transactional: AuthService.refresh runs without a surrounding tx so the
    // family-revoke commits before the 401 is thrown (D4 reuse detection).
    @Transactional
    @Modifying
    void deleteByFamilyId(String familyId);

    @Transactional
    @Modifying
    void deleteByUserId(String userId);
}
