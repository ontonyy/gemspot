package ee.gemspot.api.repository;

import ee.gemspot.api.domain.EmailChangeToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface EmailChangeTokenRepository extends JpaRepository<EmailChangeToken, String> {

    /** Latest active (unused) token for a user — backs the derived pending-email state. */
    Optional<EmailChangeToken> findFirstByUserIdAndUsedFalseOrderByCreatedAtDesc(String userId);

    /** Clear prior tokens so only one active change exists per user. */
    @Transactional
    @Modifying
    void deleteByUserId(String userId);
}
