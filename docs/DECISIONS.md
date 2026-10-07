# Architectural Decisions & Technical Log (ADR)

This document records the architectural and engineering decisions made during the transformation of the Online Banking System into a production-grade enterprise application.

---

## 1. Security Architecture (Phase 1)
- **Stateless Spring Security + JWT:** Implemented `SecurityFilterChain` with `SessionCreationPolicy.STATELESS`. Every incoming HTTP request is intercepted by `JwtAuthenticationFilter` (`OncePerRequestFilter`), resolving the `Authorization: Bearer <token>` header, parsing claims, and setting an authenticated `UsernamePasswordAuthenticationToken` in Spring's `SecurityContextHolder`.
- **JWT Secret Resolution:** Strict enforcement of `JWT_SECRET` environment variable or application property with a minimum 256-bit key length requirement. No hardcoded secrets in source code.
- **Refresh Token Mechanism:** Short-lived access token (15 minutes) coupled with a refresh token (7 days) returned at login, enabling seamless background session extension without sacrificing security.
- **Role-Based Authorization:** Defined roles `ROLE_CUSTOMER`, `ROLE_STAFF`, and `ROLE_ADMIN`. Added method-level security with `@PreAuthorize` and route rules. Added authorization checks to ensure customer accounts can only be accessed or modified by their owner or elevated staff/admin roles.
- **BCrypt Password Hashing:** Utilized Spring Security's `BCryptPasswordEncoder` with strength 12. Plaintext passwords detected at startup or during authentication are automatically upgraded and migrated to BCrypt hashes.
- **Brute-Force Protection / Rate Limiting:** Implemented an in-memory sliding window / bucket rate limiter for `/login` endpoints to lock out IP or username after 5 consecutive failed attempts for 15 minutes.
- **Input Validation & Global Error Handling:** Added `jakarta.validation` annotations on all incoming request DTOs (`@Valid`, `@NotBlank`, `@Positive`, `@Email`, etc.). Unified exception handling with `@RestControllerAdvice` returning a standard RFC 7807-inspired JSON response structure (`timestamp`, `status`, `error`, `message`, `path`, `fieldErrors`).
- **Global CORS Policy:** Centralized via `CorsConfigurationSource` reading `ALLOWED_ORIGINS` (defaulting safely to frontend dev/preview URLs) and eliminating per-controller `@CrossOrigin("*")`.

---

## 2. Financial Correctness (Phase 2)
- **Account Model as Single Source of Truth:** Transformed `Account` / `Customer` to maintain a persisted, transactional `balance` column as the single source of truth, rather than calculating balance on-the-fly via unindexed table scans.
- **ACID Transaction Boundaries:** Explicit `@Transactional(rollbackFor = Exception.class, isolation = Isolation.READ_COMMITTED)` across transfers, deposits, withdrawals, and loan disbursements.
- **Deadlock-Free Pessimistic Locking:** Implemented `PESSIMISTIC_WRITE` locking when querying accounts during balance mutations. To avoid database deadlocks during bidirectional concurrent transfers (Account A -> B and B -> A), accounts are consistently acquired in strict numerical ID order (lower ID locked first, followed by higher ID).
- **BigDecimal for Currency:** Replaced all `Double` floating-point fields with `BigDecimal` with scale 2 and `RoundingMode.HALF_UP` to prevent IEEE 754 precision loss.
- **Idempotency & Auditability:** Introduced an `idempotencyKey` header/field on transfer endpoints. Requests with duplicate keys return the cached or previous transaction outcome without re-executing balance deductions. Every transaction is assigned a unique reference string (`TXN-YYYYMMDD-UUID`).
- **Soft Delete Pattern:** Replaced destructive hard `DELETE` queries with an account status flag (`ACTIVE`, `INACTIVE`, `SUSPENDED`).
- **High-Performance Reporting:** Replaced inefficient in-memory `findAll().stream()` operations with JPQL/SQL aggregations (`COUNT`, `SUM`, `AVG`), with `COALESCE` and null-safe division.
- **Audit Logging:** Implemented an immutable `AuditLog` entity recording `actorUsername`, `role`, `action`, `resourceType`, `resourceId`, `details`, `ipAddress`, and `timestamp`.

---

## 3. Database & Configuration (Phase 3)
- **Flyway Database Migrations:** Versioned DDL and DML scripts (`V1__init_schema.sql`, `V2__seed_demo_data.sql`) ensuring deterministic, repeatable database setup across environments.
- **Profile-Driven Configuration:** Separated configs into `application.properties` (defaults), `application-dev.properties` (local MySQL/H2), and `application-prod.properties` (container/cloud environment with strict env var requirements).
- **Docker Compose:** Provided multi-stage Dockerfiles and a `docker-compose.yml` linking MySQL 8.0, the Spring Boot backend, and Vite frontend with health checks.
- **Actuator Health & Metrics:** Exposed `/actuator/health` and `/actuator/info` for container orchestrator readiness and liveness probes.

---

## 4. Testing & Reliability (Phase 4)
- **Unit & Integration Test Suite:** Comprehensive test coverage for service layers, concurrency overdraw resistance, role authorization guards, and transaction rollback mechanics.
- **JaCoCo Code Coverage:** Integrated JaCoCo maven plugin enforcing test quality.
- **GitHub Actions CI:** Automated pipeline building both backend and frontend artifacts, running test suites, and verifying code quality on every push.

---

## 5. API Design & Modernization (Phase 5)
- **Springdoc OpenAPI / Swagger 3:** Self-documenting interactive REST API at `/swagger-ui/index.html` with Bearer auth support.
- **Request Tracing:** Implemented `MDC` request tracing filter assigning a unique `X-Request-Id` to every request and echoing it in response headers and log output.

---

## 6. Frontend Architecture (Phase 6)
- **Centralized Routing & Protected Routes:** Refactored React Router structure into clean nested layouts using `<Outlet />`, `ProtectedRoute` with role enforcement, and centralized error handling.
- **JWT Interceptor & Session Management:** Centralized all HTTP traffic through `apiClient` with automatic token attachment and 401 token refresh/logout handling.
- **Fintech Dashboard Experience:** Upgraded UI aesthetics with responsive layouts, transaction filtering, dark mode support, real-time feedback, and statement generation.
