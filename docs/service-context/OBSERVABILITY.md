# Observability

<!-- service-context:auto:start -->

## Logging

- Structured JSON → stdout via Logstash encoder (`api/src/main/resources/logback-spring.xml`).
- MDC `correlationId` promoted to JSON top-level.
- Per-request correlation: `X-Correlation-Id` (legacy `X-Request-Id`) minted if absent,
  echoed on response + MDC (`common/RequestLoggingFilter.java`).
- Request log line at INFO: METHOD, URI, status, duration_ms.

## Metrics

- Spring Actuator endpoints exposed: `/actuator/health/**`, `/actuator/prometheus` (permit-all,
  network-scoped in prod).
- Micrometer Prometheus registry; all metrics tagged `application=gemspot-api`.

## Error tracking

- Sentry opt-in via `SENTRY_DSN` (no-op when unset). Captures 5xx / unhandled exceptions.
  `send-default-pii: false` — no PII.

## Documented trade-off (not a defect)

Web frontend persists access + refresh JWT to `localStorage` (`web/src/shared/store/authStore.ts`).
Deliberate SPA choice; mitigated by 15m access TTL + server-side refresh-reuse detection
(`refresh_tokens` family). Recorded here as known behavior, not an open issue.

**Confidence**: HIGH.

<!-- service-context:auto:end -->
