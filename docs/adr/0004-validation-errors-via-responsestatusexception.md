# 4. Bean-validate handler parameters rather than bind enums, while the catch-all handler stands

Date: 2026-09-17

## Status

Accepted

## Context

Admin status parameters were parsed with `valueOf()` on an unvalidated string, so a typo returned `500` instead of `400`. The idiomatic Spring fix is to bind the parameter as the enum itself and let the framework reject anything else.

That does not work here. `GlobalExceptionHandler` has a catch-all `@ExceptionHandler(Exception.class)` mapping to `500`. Enum binding fails with `MethodArgumentTypeMismatchException`, which is **not** a `ResponseStatusException`, so the catch-all swallows it and the response is still `500`. The same applies to `@Validated` on a controller class: it switches validation to the AOP path, which throws `ConstraintViolationException` — also swallowed.

`@Pattern` on a handler method parameter is the one route that works unchanged: it raises `HandlerMethodValidationException`, which extends `ResponseStatusException`, and the existing handler already maps it to `400`.

## Decision

Validate handler parameters with Bean Validation annotations (`@Pattern`, `@NotNull`) that surface as `ResponseStatusException`. Do not bind enums at the controller boundary, and do not annotate controllers `@Validated`, while the catch-all handler stands.

## Consequences

- The valid values of a status parameter are expressed twice: once in the enum, once in a `@Pattern` regex. They can drift. That is the cost of this decision and the reason it is written down rather than absorbed.
- The constraint is the catch-all handler, not the validation style. If `GlobalExceptionHandler` is ever narrowed — so that framework exceptions reach Spring's own resolvers instead of being flattened to `500` — enum binding becomes both correct and cleaner, and this decision should be revisited rather than preserved out of habit.
- Anything else that relies on Spring raising a non-`ResponseStatusException` and expecting a sensible status code has the same problem. This is not specific to admin status parameters.

