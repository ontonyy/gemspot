# Messaging

<!-- service-context:auto:start -->

**Not Applicable.** No message broker — no Kafka, RabbitMQ, or SQS at commit `aad27f1`.
Analytics events (`POST /events`, 202) are persisted **synchronously** to the `events`
PostgreSQL table (see [DATA.md](DATA.md)); fire-and-forget from the client's perspective,
but server-side synchronous.

**Confidence**: HIGH.

<!-- service-context:auto:end -->
