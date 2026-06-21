# syntax=docker/dockerfile:1
# Multi-stage build (spec §Phase 8). Build with Gradle/JDK 25, run on a slim JRE.

# --- build stage ---
FROM gradle:9-jdk25 AS build
WORKDIR /app
COPY . .
RUN gradle bootJar --no-daemon

# --- runtime stage ---
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
# Run as non-root (Cloud Run best practice).
RUN useradd --system --uid 10001 spring \
    && chown spring:spring /app/app.jar
USER spring
# Cloud Run sets $PORT (default 8080); app binds it via server.port: ${PORT:8080}.
ENV PORT=8080
EXPOSE 8080
# Container-aware heap; expose $PORT through to the JVM.
ENTRYPOINT ["sh","-c","java -XX:MaxRAMPercentage=75 -jar app.jar"]
