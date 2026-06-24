package ee.gemspot.api.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Outbound mail for account flows. Currently only the verified email-change link.
 *
 * <p>Dev fallback: the verification link is always logged at INFO regardless of
 * SMTP outcome, so local development works against MailHog (localhost:1025) or
 * with no SMTP server at all — a send failure is logged, not propagated, so the
 * change-request endpoint never 500s because mail is down.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;
    private final String from;

    public MailService(JavaMailSender mailSender,
                       @Value("${app.mail.from:no-reply@gemspot.local}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    /** Send the email-change verification link to the NEW address. */
    public void sendEmailChangeVerification(String toEmail, String link) {
        // Always surface the link for dev (MailHog / no SMTP).
        log.info("Email-change verification link for {}: {}", toEmail, link);

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(from);
        msg.setTo(toEmail);
        msg.setSubject("Confirm your new GemSpot email");
        msg.setText("""
                You requested to change your GemSpot account email to this address.

                Confirm the change by opening this link:
                %s

                The link expires soon. If you did not request this, ignore this email.
                """.formatted(link));
        try {
            mailSender.send(msg);
        } catch (Exception e) {
            // Dev/no-SMTP: don't fail the request — the link is already logged above.
            log.warn("Failed to send email-change verification to {}: {}", toEmail, e.getMessage());
        }
    }
}
