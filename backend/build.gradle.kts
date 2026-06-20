plugins {
    java
    id("org.springframework.boot") version "3.5.6"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "ee.gemspot"
version = "0.3.0-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

repositories {
    mavenCentral()
}

extra["awssdkVersion"] = "2.31.78"
extra["sentryVersion"] = "8.43.2"

dependencies {
    // Web / REST
    implementation("org.springframework.boot:spring-boot-starter-web")
    // Persistence
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    // Validation
    implementation("org.springframework.boot:spring-boot-starter-validation")
    // Security
    implementation("org.springframework.boot:spring-boot-starter-security")
    // Migrations
    implementation("org.liquibase:liquibase-core")
    // Actuator (health, metrics)
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // D8: Sentry error tracking (no-op without SENTRY_DSN).
    implementation(platform("io.sentry:sentry-bom:${property("sentryVersion")}"))
    implementation("io.sentry:sentry-spring-boot-starter-jakarta")

    // D8: Micrometer Prometheus registry → /actuator/prometheus. Version via Boot BOM.
    implementation("io.micrometer:micrometer-registry-prometheus")

    // Postgres driver
    runtimeOnly("org.postgresql:postgresql")

    // JWT (JJWT 0.12.x)
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

    // Supabase Storage (S3-compatible)
    implementation(platform("software.amazon.awssdk:bom:${property("awssdkVersion")}"))
    implementation("software.amazon.awssdk:s3")

    // D8: structured JSON logging to stdout
    implementation("net.logstash.logback:logstash-logback-encoder:8.0")

    // Test (JUnit 5 + Mockito)
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")

    // D6: Testcontainers integration layer (real Postgres). Versions via Boot BOM.
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:postgresql")
}

tasks.withType<JavaCompile> {
    // Retain parameter names so Spring can resolve constructor/method args by name.
    options.compilerArgs.add("-parameters")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
