package ee.gemspot.api.common;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/** Port of {@code relative-time.spec.ts}: just now / minutes / hours / days boundaries. */
class RelativeTimeTest {

    private static final Instant NOW = Instant.parse("2026-06-04T12:00:00Z");
    private static final long SEC = 1000;
    private static final long MIN = 60 * SEC;
    private static final long HR = 60 * MIN;
    private static final long DAY = 24 * HR;

    private static String ago(long millis) {
        return RelativeTime.relativeTime(NOW.minusMillis(millis), NOW);
    }

    @Test
    void readsJustNowUnder45s() {
        assertThat(ago(10 * SEC)).isEqualTo("just now");
    }

    @Test
    void clampsFutureDatesToJustNow() {
        assertThat(RelativeTime.relativeTime(NOW.plusMillis(5 * SEC), NOW)).isEqualTo("just now");
    }

    @Test
    void singularVsPluralMinutes() {
        assertThat(ago(1 * MIN)).isEqualTo("1 minute ago");
        assertThat(ago(5 * MIN)).isEqualTo("5 minutes ago");
    }

    @Test
    void hoursAndDays() {
        assertThat(ago(1 * HR)).isEqualTo("1 hour ago");
        assertThat(ago(3 * HR)).isEqualTo("3 hours ago");
        assertThat(ago(1 * DAY)).isEqualTo("1 day ago");
        assertThat(ago(12 * DAY)).isEqualTo("12 days ago");
    }
}
