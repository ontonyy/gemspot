package ee.gemspot.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// Pure JWT auth (no form login / HTTP basic) — exclude the default in-memory
// UserDetailsService so Boot stops minting a dev login + generated password.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class GemSpotApplication {

    public static void main(String[] args) {
        SpringApplication.run(GemSpotApplication.class, args);
    }
}
