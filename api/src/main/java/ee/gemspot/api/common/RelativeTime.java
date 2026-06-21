package ee.gemspot.api.common;

import java.time.Duration;
import java.time.Instant;

/**
 * Human-relative label matching the mock's "just now" style, used for the
 * submittedAt/reportedAt strings the SPA renders. Keeps the DTO contract
 * (a relative string, not an ISO timestamp).
 *
 * <p>Byte-identical port of {@code relative-time.ts}.
 */
public final class RelativeTime {

    private RelativeTime() {}

    public static String relativeTime(Instant date) {
        return relativeTime(date, Instant.now());
    }

    public static String relativeTime(Instant date, Instant now) {
        long sec = Math.max(0, Duration.between(date, now).getSeconds());
        if (sec < 45) return "just now";
        long min = sec / 60;
        if (min < 60) return min + " minute" + (min == 1 ? "" : "s") + " ago";
        long hr = min / 60;
        if (hr < 24) return hr + " hour" + (hr == 1 ? "" : "s") + " ago";
        long day = hr / 24;
        return day + " day" + (day == 1 ? "" : "s") + " ago";
    }
}
