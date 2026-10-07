# Project Upgrade Progress Checklist

## Phase 1: Security Hardening (Highest Priority)
- [x] Add Spring Security with stateless SecurityFilterChain and JwtAuthenticationFilter (OncePerRequestFilter) validating Bearer token and setting SecurityContext.
- [x] Role-based access (CUSTOMER, STAFF, ADMIN) with method/route authorization. Customer data isolation (access only own data).
- [x] BCrypt password hashing + startup migration to rehash legacy plaintext passwords.
- [x] Load JWT secret strictly from JWT_SECRET env var (no hardcoded fallback secret), short-lived access token + refresh token mechanism.
- [x] Replace all `@CrossOrigin("*")` with global CORS configuration driven by `ALLOWED_ORIGINS` env var.
- [x] Login rate limiting / lockout after repeated failures (in-memory or cache-based).
- [x] DTO validation (`@Valid`, `@NotNull`, `@Positive`, etc.) on every request body.
- [x] `@RestControllerAdvice` global exception handler returning uniform JSON error responses.
- [x] Build and test verification, git commit: `phase-1: security hardening`.

## Phase 2: Financial Correctness
- [x] Single source of truth account balance column (or proper Account entity), remove disconnected accountBalance and block it from profile updates.
- [x] `@Transactional(rollbackFor = Exception.class)` on fund transfers, deposits, withdrawals, and loan disbursements.
- [x] Pessimistic locking (`@Lock(LockModeType.PESSIMISTIC_WRITE)`) with consistent lock order (e.g. by account ID) to eliminate race conditions and deadlocks.
- [x] Strict validation: amount > 0 and sufficient balance checks on every withdrawal, transfer, and transaction add endpoint.
- [x] Idempotency key on transfer endpoints and unique transaction reference numbers (UUID / structured).
- [x] Migrate monetary amounts to `BigDecimal` (eliminating `Double` precision issues) with configurable daily/per-transfer limits.
- [x] Customer soft delete (status = INACTIVE) instead of hard delete.
- [x] Replace `findAll().stream()` reports with SQL/JPQL aggregations (`COUNT`, `SUM`, `GROUP BY`) handling divide-by-zero and nulls gracefully.
- [x] Pagination and filtering for transaction and customer list endpoints.
- [x] Audit log table tracking user actions (login, transfer, loan approval, etc.) with timestamp and actor details.
- [x] Build and test verification, git commit: `phase-2: financial correctness`.

## Phase 3: Database and Config
- [ ] Flyway migrations for full schema + demo seed data (1 admin, 1 staff, 3 customers with sample transactions and loans).
- [ ] Sensible defaults in `application.properties` (localhost MySQL) and Spring profiles (`dev`, `prod`, `test`).
- [ ] Backend port default 8080 aligned with frontend `.env` and `.env.example`.
- [ ] `docker-compose.yml` orchestrating MySQL, backend, and frontend with a single command.
- [ ] Spring Boot Actuator health endpoint configured and accessible.
- [ ] Build and test verification, git commit: `phase-3: database and config`.

## Phase 4: Testing and CI
- [ ] Service layer unit tests (transfers, loans, validations, limits, balance checks).
- [ ] Integration tests covering auth flow, role-based 403 checks, transfer success, rollback, and concurrency tests (ExecutorService overdraw prevention).
- [ ] 70%+ service layer test coverage with JaCoCo report plugin.
- [ ] GitHub Actions CI workflow building and testing backend and building frontend on every push.
- [ ] Build and test verification, git commit: `phase-4: testing and ci`.

## Phase 5: API Quality
- [ ] Springdoc OpenAPI / Swagger UI with JWT Bearer auth integration and endpoint documentation.
- [ ] Consistent REST naming, standard HTTP status codes, and API versioning (`/api/v1`).
- [ ] Structured logging with Request-ID (MDC / filter) propagated in logs and response headers.
- [ ] Build and test verification, git commit: `phase-5: api quality`.

## Phase 6: Frontend Modernization
- [ ] Universal use of `apiClient` (`axiosConfig.js`), token refresh on 401 interceptor, redirect on expiry.
- [ ] JWT-based auth replacing localStorage flags, `ProtectedRoute` with role checking, centralized routing with layout wrappers and `<Outlet />`.
- [ ] Fix NotFound route order and rename `Transcations.jsx` to `Transactions.jsx`.
- [ ] Visibility-aware polling (`document.visibilityState`) with sane interval.
- [ ] Loading skeletons, toast notifications, error boundaries/states, form validations.
- [ ] Complete ManageCustomers (view, edit, deactivate) and Staff Management.
- [ ] Responsive modern fintech UI overhaul.
- [ ] Recruiter-impressing features: spending analytics chart, search/filter/CSV export, dark mode toggle, branded PDF statement download.
- [ ] Build and test verification, git commit: `phase-6: frontend modernization`.

## Phase 7: Repository and Documentation
- [ ] Remove `BACKEND/.metadata` from git and create comprehensive `.gitignore`.
- [ ] Professional `README.md` with architecture diagram (Mermaid), features, security design, local setup, demo credentials, and design decisions.
- [ ] `.env.example` files for backend and frontend without committed secrets.
- [ ] Build and test verification, git commit: `phase-7: repo and docs`.

## Phase 8: Deployment Readiness
- [ ] Cloud deployment readiness for backend (Render/Railway Dockerfile reading env vars).
- [ ] Vercel deployment readiness for frontend (`vercel.json` rewrites for SPA routing, `VITE_API_URL`).
- [ ] Step-by-step deployment guide in `docs/DEPLOY.md`.
- [ ] Build and test verification, git commit: `phase-8: deployment readiness`.

## Final Verification
- [ ] Full backend build and tests pass.
- [ ] Frontend build succeeds cleanly.
- [ ] End-to-end smoke test across roles (Admin, Staff, Customer).
- [ ] Final project summary and delivery.
