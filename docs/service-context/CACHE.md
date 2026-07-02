# Cache

<!-- service-context:auto:start -->

**Not Applicable.** No cache layer — no Redis, Dragonfly, Caffeine, or Spring `@Cacheable`
at commit `aad27f1`. The service is stateless; reads hit PostgreSQL directly (see
[DATA.md](DATA.md)).

**Confidence**: HIGH.

<!-- service-context:auto:end -->
