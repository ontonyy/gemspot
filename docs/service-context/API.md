# API — index

Index only. Endpoint detail lives in [HTTP.md](HTTP.md). This file summarizes transport
presence and points at the authoritative docs.

<!-- service-context:auto:start -->

## Presence summary

| Surface | Present? | Doc |
|---------|----------|-----|
| Inbound REST | ✅ Yes (11 controllers, root-mounted, port 8080) | [HTTP.md](HTTP.md) |
| Outbound HTTP | ✅ Yes (Google/Facebook OAuth verification, Supabase S3) | [HTTP.md](HTTP.md), [DEPENDENCIES.md](DEPENDENCIES.md) |
| Inbound gRPC | ❌ No | [GRPC.md](GRPC.md) |
| Outbound gRPC | ❌ No | [GRPC.md](GRPC.md) |
| Messaging | ❌ No broker | [MESSAGING.md](MESSAGING.md) |
| Mutating ops | ✅ Yes — see HTTP.md (POST/PATCH/DELETE on auth, saved, submissions, reports, uploads, admin) | [HTTP.md](HTTP.md) |

**Confidence**: HIGH (all transports grep-verified at `aad27f1`).

<!-- service-context:auto:end -->
