# Full-Stack Production Audit Report

**Stack:** Spring Boot + Hibernate + React + Redux Toolkit  
**Date:** 2025-02-19  
**Mode:** Security-critical, performance-critical, high-traffic production

---

## Executive Summary

The codebase has solid foundations (pagination, Redis caching for workflows/roles, read-only transactions, RTK Query) but **several critical issues** must be fixed before production: **token storage in localStorage** (XSS/theft), **missing task-level authorization** (any user can read/cancel any task), **N+1 query storms** on list endpoints, **default JWT secret** in config, **H2 console** exposed, and **no 401/refresh flow** on the frontend. This document lists specific findings with file references, impact, priority, and concrete refactors.

---

# PART 1 — BACKEND (Spring Boot + Hibernate)

## 1. Performance Under High Load

### 1.1 N+1 Query Problems — CRITICAL

**Location:**  
- `WorkflowService.getAllWorkflows(Pageable)` and `getPublishedWorkflows(Pageable)`  
- `TaskService.getMyTasks(...)` and `TaskService.getTaskById(Long)`  
- `WorkflowService.updateWorkflow(...)` (loading workflow then steps)

**Issue:**  
- **Workflow list:** `workflowRepository.findAll(pageable).map(this::toDto)` (and `findByStatus(..., pageable)`). `toDto(workflow)` accesses `workflow.getCreatedBy()`, `workflow.getSteps()` and, per step, `getFormFields()`, `getBusinessRules()`, `getAssignedRole()`. All are lazy except `createdBy` (single fetch per workflow). Result: **1 + N×(1 + steps + steps×collections)** queries per page (e.g. 20 workflows × multiple lazy loads = query storm).  
- **Task list:** `instanceRepository.findByAssigneeId(..., pageable).map(this::toDto)`. `toDto(instance)` touches `instance.getWorkflow()`, `getCurrentStep()`, `getAssignee()`, `getInitiatedBy()` — four lazy loads per row. **1 + 4×pageSize** queries per request.  
- **Single task:** `getTaskById` does `findById(id)` then `toDto(instance)` → **1 + 4** queries.

**Why it matters:** Under high concurrency, N+1 multiplies DB round-trips and can exhaust the connection pool, increase latency, and saturate the database.

**Refactor:**

1) **Workflow list** — Use a DTO projection or a single query with `EntityGraph`/JOIN FETCH so one query (or a small, bounded number) returns everything needed for the list (id, name, description, status, createdBy username, step count). Do **not** load full `Workflow` + steps + formFields + businessRules for list view.

Example (repository):

```java
// WorkflowRepository.java
@Query("SELECT new com.workflow.dto.WorkflowListDto(w.id, w.name, w.description, w.status, w.createdBy.username, size(w.steps)) " +
       "FROM Workflow w LEFT JOIN w.createdBy WHERE w.status = :status")
Page<WorkflowListDto> findListByStatus(@Param("status") WorkflowStatus status, Pageable pageable);

@Query("SELECT new com.workflow.dto.WorkflowListDto(w.id, w.name, w.description, w.status, w.createdBy.username, size(w.steps)) " +
       "FROM Workflow w LEFT JOIN w.createdBy")
Page<WorkflowListDto> findAllList(Pageable pageable);
```

Use `WorkflowListDto` (id, name, description, status, createdByUsername, stepCount) in `getAllWorkflows` / `getPublishedWorkflows` instead of full `WorkflowDto` built from full entity graph. If you must keep returning full `WorkflowDto` for list, add a dedicated `findAllWithCreatedByOnly(Pageable)` and only load steps when opening a single workflow (already done with `findWithStepsById`).

2) **Task list / single task** — Either:

- Add a repository method that fetches `WorkflowInstance` with `workflow`, `currentStep`, `assignee`, `initiatedBy` in one query (e.g. `@EntityGraph` or JOIN FETCH), or  
- Use a DTO projection (constructor expression) that joins the needed fields in one query.

Example (single query for page of instances):

```java
// WorkflowInstanceRepository.java
@EntityGraph(attributePaths = { "workflow", "currentStep", "assignee", "initiatedBy" })
Page<WorkflowInstance> findByAssigneeId(Long assigneeId, Pageable pageable);
```

Then `toDto` no longer triggers lazy loads. Apply the same idea for `findById` when used for get-task-by-id.

---

### 1.2 Unbounded Queries — HIGH

**Location:** `RoleService.getAllRoles()` — `roleRepository.findAll()`.

**Issue:** Loads all roles into memory with no limit. With many roles and `ElementCollection` (permissions) eager, memory and response size grow unbounded.

**Why it matters:** Scalability, memory usage, and predictable latency.

**Refactor:** Either paginate the roles API (`Page<RoleDto>`) or keep a small bounded list with an explicit limit (e.g. `findAll(PageRequest.of(0, 500))`) and document the contract. Prefer pagination for consistency.

---

### 1.3 UserDetails Load on Every Request — HIGH

**Location:** `JwtAuthFilter.doFilterInternal` → `userDetailsService.loadUserByUsername(username)` on every request that has a valid JWT.

**Issue:** Every authenticated API call triggers a DB hit (User + EAGER roles). Under high traffic this doubles (or more) database load.

**Why it matters:** DB round-trips, connection pool pressure, latency.

**Refactor:**  
- Cache `UserDetails` (or a minimal representation: username, authorities) in Redis with TTL aligned with access token (e.g. 15 min). In the filter, resolve from cache; on miss load from DB and put in cache. Invalidate on logout/password change/role change if applicable.  
- Or use a short-lived in-memory cache (e.g. Caffeine) keyed by username with TTL ~1–5 minutes.  
- Ensure cache key includes something that invalidates when roles change (e.g. user id + version or “all” invalidation on role assign/remove).

---

### 1.4 Blocking and Connection Pool

**Location:** All controllers and services are synchronous. No async or reactive usage.

**Assessment:** Acceptable if request handling is fast. With N+1 fixed and caching in place, blocking is less of an issue. HikariCP pool size 20 is reasonable; tune based on actual DB capacity and number of app instances (total connections ≈ instances × pool size).

**Recommendation:** Add HikariCP metrics (e.g. `spring.datasource.hikari.register-mbeans` or Micrometer) and alert on pool exhaustion. Consider `connection-timeout` and `validation-timeout` in config.

---

## 2. Hibernate & JPA Optimization

### 2.1 EAGER Loading on User and Role — MEDIUM

**Location:**  
- `User.roles`: `@ManyToMany(fetch = FetchType.EAGER)`  
- `Role.permissions`: `@ElementCollection(fetch = FetchType.EAGER)`

**Issue:** Every `User` load pulls roles (and every `Role` load pulls permissions). When listing users (paginated), each row already has roles loaded (no N+1 for roles), but you load more data than needed for list view. When loading a single user for auth, you need roles, so EAGER there is functionally OK but forces a fixed pattern.

**Why it matters:** Over-fetching, unnecessary joins/selects, slightly larger memory per entity.

**Refactor:** Prefer LAZY by default. Use `EntityGraph` or explicit fetch joins only where you need roles (e.g. auth, “get current user”). For user list, consider a DTO projection that only needs role names (single query with join).

---

### 2.2 WorkflowService.getWorkflow / getPublishedWorkflow — Force-Init of Lazy — MEDIUM

**Location:** `WorkflowService.getWorkflow`, `getPublishedWorkflow`, `publishWorkflow`:

```java
workflow.getSteps().forEach(s -> s.getBusinessRules().size());
workflow.getBusinessRules().size();
```

**Issue:** Explicitly initializing lazy collections inside a read-only transaction is acceptable, but the repository already uses `findWithStepsById` with JOIN FETCH for steps, formFields, assignedRole. Business rules are not in that fetch graph, so they cause extra queries. So you still have N+1 for business rules per step and for workflow-level businessRules.

**Refactor:** Extend the repository fetch so that step-level and workflow-level business rules are loaded in the same query (e.g. add `LEFT JOIN FETCH s.businessRules` and workflow-level rules in the same or a second optimized query), and remove the manual `.size()` inits. Alternatively, add a second fetch for rules in one batch (e.g. by workflow id and step ids) and attach to the graph in service layer if you want to avoid changing the single large fetch.

---

### 2.3 WorkflowService.updateWorkflow — Clear and Rebuild Steps — MEDIUM

**Location:** `WorkflowService.updateWorkflow`: `workflow.getSteps().clear()` then `addStep(...)` for each DTO.

**Issue:** With `orphanRemoval = true`, `clear()` deletes all step rows (and cascades to form_fields, business_rules). Then you add new steps and persist. So: one SELECT workflow, one SELECT steps (when clear triggers load), then many DELETEs and INSERTs. No batching of deletes; order_deletes is not set in Hibernate (only order_inserts/order_updates). Can cause many round-trips and lock contention.

**Refactor:**  
- Prefer differential update: load existing steps, match by id from DTOs, update in place, add new, remove missing. That reduces churn and allows Hibernate to batch updates.  
- If you keep “clear and replace,” ensure Hibernate batch delete is configured (e.g. `order_deletes true`) and consider doing the delete in a separate batch (e.g. `stepRepository.deleteByWorkflowId(id)` then flush then add new steps) so that batch_size and order_deletes apply.

---

### 2.4 equals/hashCode and Entity Identity — LOW

**Location:** All entities in `com.workflow.model` use Lombok `@Getter`/`@Setter` (and similar) but do not define `equals`/`hashCode`.

**Issue:** Default (reference equality) can break sets/maps that rely on entity identity, and can cause duplicate entries in collections when merging/detaching. Hibernate recommends equals/hashCode on natural key or on id (if id is set and stable).

**Refactor:** For entities with a stable `id` after persist, use id-based equals/hashCode (e.g. Lombok `@EqualsAndHashCode(of = "id")`). Be consistent and avoid including lazy collections in equals/hashCode.

---

### 2.5 Pagination and Unbounded Result Sets

**Assessment:** List endpoints use `Pageable` and `Page<>` (workflows, tasks, users). Only roles list is unbounded (see 1.2). Good practice: ensure default page size is capped (e.g. max 100) in `Pageable` config or in controllers (`@PageableDefault(size = 20)` and validate or cap `size` parameter).

---

## 3. Caching Strategy

### 3.1 Current State

**Location:** `RedisConfig`, `WorkflowService` (`@Cacheable("workflows")`, `@CacheEvict`), `RoleService` (`@Cacheable("roles")`, `@CacheEvict`).

**Positive:** Redis cache manager with TTL (workflows 30 min, roles 1 h, default 15 min). Cache eviction on create/update/delete. Null values disabled.

### 3.2 Cache Stampede — MEDIUM

**Issue:** No cache stampede protection. Under load, many threads can miss the same key and hit the DB simultaneously.

**Refactor:** Consider a lock-per-key (e.g. Redisson lock or a simple in-memory lock per key) so only one thread loads and others wait or use a “reserve” placeholder. Alternatively use a short TTL with probabilistic early expiration (e.g. “stale-while-revalidate”) to reduce spikes.

### 3.3 RoleService.getAllRoles — Single Key — LOW

**Issue:** `@Cacheable(value = "roles")` with no key caches the entire list under one key. First caller loads all roles; others get the cached list. Fine for small, rarely changing data. Ensure role list is not huge (see 1.2).

### 3.4 Read-Through and Invalidation

**Assessment:** Cache-aside is used. Eviction on write is correct. No read-replica usage in code; if you introduce read replicas later, route read-only queries to replicas and keep cache invalidation on writes to primary.

---

## 4. Transaction Management

### 4.1 Correctness

**Location:** Services use `@Transactional` and `@Transactional(readOnly = true)` appropriately for writes and reads. `UserDetailsServiceImpl.loadUserByUsername` is `@Transactional(readOnly = true)`.

### 4.2 AuthService — Missing @Transactional on login/refresh — LOW

**Location:** `AuthService.login` and `AuthService.refreshToken` are not `@Transactional`. They call `userRepository.findByUsername` and `user.getRoles()`.

**Issue:** If the persistence context is closed before `getRoles()`, lazy load could fail. In practice, the filter or auth manager may have already loaded the user in a transaction, so this might not fail, but it’s inconsistent.

**Refactor:** Add `@Transactional(readOnly = true)` to `login` and `refreshToken` so that the user and roles are loaded in one transaction.

### 4.3 Long-Running Transactions

**Assessment:** No obvious long-running transactions. `updateWorkflow` does several operations in one transaction; with N+1 fixed and batch config, this should stay short. Monitor slow transactions in production.

---

## 5. Security Review (Backend)

### 5.1 Task and Instance Authorization — CRITICAL

**Location:** `TaskController`: `getTask(@PathVariable Long id)`, `submitStep(..., @PathVariable Long id)`, `cancelTask(@PathVariable Long id)`.

**Issue:** Any authenticated user can get, submit, or cancel **any** task by id. There is no check that the current user is the assignee, initiator, or has a role that may act on the task. This is a **privilege escalation / data leak**.

**Why it matters:** Security, compliance, data integrity.

**Refactor:** In `TaskService`, resolve the current user (e.g. from `Authentication` or username) and:

- For `getTaskById(id)`: load instance, then require `instance.getAssignee().getUsername().equals(currentUsername)` or `instance.getInitiatedBy().getUsername().equals(currentUsername)` (or ADMIN). Else throw `AccessDeniedException` or return 403.  
- For `submitStep(instanceId, ...)`: same ownership check (assignee or initiator or admin).  
- For `cancelTask(instanceId)`: same.  

Enforce this in service layer and document in API contract. Optionally add `@PreAuthorize` with a bean that checks task ownership if you want method-level expression.

---

### 5.2 JWT Secret and Defaults — CRITICAL

**Location:** `application.yml`: `app.jwt.secret: ${JWT_SECRET:c2VjdXJlLWp3dC1zZWNyZXQta2V5LWZvci13b3JrZmxvdy1lbmdpbmUtYXBwbGljYXRpb24tMjAyNA==}`

**Issue:** A default secret is in the repo. If `JWT_SECRET` is not set in production, attackers can forge tokens.

**Refactor:** Remove the default in production. Fail fast if `JWT_SECRET` is missing or default: e.g. in a `@PostConstruct` or `ApplicationRunner`, check that the configured secret is not the well-known default and is long enough (e.g. 256 bits for HS256). Use a secret that is at least 32 bytes (256 bits) and generated securely.

---

### 5.3 H2 Console in Production — HIGH

**Location:** `SecurityConfig`: `requestMatchers("/h2-console/**").permitAll()` and dev profile enables H2 console.

**Issue:** If the app is ever run with a profile that enables H2 console and this matcher is active, unauthenticated access to H2 console is possible. Default config uses `application-dev.yml` for H2; ensure production never enables H2 and never permits `/h2-console/**`.

**Refactor:** Make H2 console and the permit rule conditional on a dev-only profile (e.g. `@Profile("dev")` on a separate config that adds the matcher). In production, do not enable H2 console and do not register the permitAll rule for it.

---

### 5.4 CSRF Disabled — MEDIUM (Acceptable for Stateless API)

**Location:** `SecurityConfig`: `csrf(AbstractHttpConfigurer::disable)`.

**Assessment:** For a stateless JWT API that does not rely on cookie-based session CSRF, disabling CSRF is common. Ensure no cookie-based auth is used for state-changing operations and that CORS is strict (see below). Document that the API is stateless and not cookie-authenticated.

---

### 5.5 CORS — MEDIUM

**Location:** `SecurityConfig.corsConfigurationSource`: `allowedOrigins(allowedOrigins.split(","))`, `allowedHeaders(List.of("*"))`, `allowCredentials(true)`.

**Issue:** `allowedHeaders("*")` with credentials is broad. Prefer listing needed headers (e.g. `Authorization`, `Content-Type`).

**Refactor:** Set explicit `allowedHeaders` (e.g. `Authorization`, `Content-Type`, `Accept`) and ensure `allowedOrigins` in production contains only your frontend origins (no `*` when credentials are true).

---

### 5.6 AuthController Refresh — Input Validation — MEDIUM

**Location:** `AuthController.refresh`: `@RequestBody Map<String, String> request`, `request.get("refreshToken")`.

**Issue:** No validation; null or missing key can cause NPE or invalid token. No rate limiting on refresh.

**Refactor:** Use a DTO (e.g. `RefreshRequest` with `@NotBlank String refreshToken`) and `@Valid`. Return 400 when token is missing. Consider rate limiting refresh endpoint to prevent abuse.

---

### 5.7 Sensitive Data in Logs — MEDIUM

**Location:** `GlobalExceptionHandler.handleGeneric`: `ex.printStackTrace()`.

**Issue:** Stack traces can leak internal paths and logic. In production, logs should be structured and stack traces sent to a secure log aggregator, not printed to stdout in a way that could be exposed.

**Refactor:** Use a logger (e.g. `log.error("Unexpected error", ex)`) and ensure production log level and format do not expose stack traces to end users. Return a generic message in the API response (you already do); avoid including exception message in response.

---

### 5.8 Secure Headers — LOW

**Location:** `SecurityConfig`: only `frameOptions(sameOrigin())` is set.

**Refactor:** Add security headers (e.g. `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Content-Security-Policy` if applicable). Use `headers(headers -> headers.contentSecurityPolicy(...))` or a dedicated filter. Prefer a library (e.g. Spring Security headers) for consistency.

---

## 6. API Design & Maintainability

### 6.1 REST and HTTP — GOOD

Controllers return appropriate status codes (200, 204, 400, 401, 404). Global exception handler maps exceptions to status codes. Pagination uses `Page` and standard `page`/`size`. Separation of controller/service/repository is clear; no business logic in controllers.

### 6.2 Pagination Metadata — LOW

**Issue:** Ensure API responses include pagination metadata (totalElements, totalPages, first, last, etc.) so clients can build UIs correctly. Spring `Page` already provides this; verify frontend uses it (e.g. `totalPages`, `totalElements`).

### 6.3 Idempotency — LOW

**Assessment:** POST endpoints (login, register, start workflow, submit step, cancel) are not idempotent by design. For start workflow or submit step, consider idempotency keys in future if you need to prevent duplicate submissions under retries.

### 6.4 Observability — MEDIUM

**Recommendation:** Add structured logging (e.g. JSON logs with trace id), Micrometer metrics (HTTP, DB, cache, custom), and tracing (e.g. Sleuth/Brave). Ensure no sensitive data (tokens, passwords) in logs. Add health endpoints (`/actuator/health`) and protect or exclude sensitive actuator endpoints in production.

---

# PART 2 — FRONTEND (React + Redux Toolkit)

## 1. Rendering Performance

### 1.1 List Keys and Animations — LOW

**Location:** `TaskListPage`, `WorkflowListPage`: list items use `key={task.id}` / `key={wf.id}` (good). `motion.tr` / `motion.div` with index-based delay is fine for small lists.

**Recommendation:** If task or workflow lists become large (hundreds), consider list virtualization (e.g. `react-window` or `@tanstack/react-virtual`) and avoid animating every row (e.g. animate container only).

### 1.2 Expensive Work in Render — LOW

**Assessment:** No heavy computation observed in render. `TaskExecutionPage` uses `workflow?.steps?.find(...)` which is O(n) in steps; acceptable for typical step count.

### 1.3 Code Splitting — MEDIUM

**Location:** `App.tsx` — all routes and pages are imported statically.

**Issue:** Admin and task pages are loaded in the initial bundle even when user only visits login/dashboard.

**Refactor:** Use `React.lazy` and `Suspense` for route components (e.g. `WorkflowDesigner`, `RoleManagerPage`, `TaskExecutionPage`, `WorkflowListPage`). Keep `LoginPage`, `DashboardPage`, and shell in main bundle if desired.

---

## 2. Redux Toolkit & RTK Query

### 2.1 Auth State and Tokens in Redux + localStorage — CRITICAL (Security)

**Location:** `authSlice.ts`: state holds `accessToken`, `refreshToken`; `localStorage.setItem('auth', JSON.stringify(state))` on login; tokens read from Redux (e.g. `prepareHeaders` in APIs use `(getState() as RootState).auth.accessToken`).

**Issue:**  
- Tokens in **localStorage** are accessible to any script on the same origin. A single XSS vulnerability allows token theft and full account takeover.  
- Tokens in **Redux state** are visible in DevTools and in any serialization (e.g. persistence, debugging).  
- OWASP and security best practice: access tokens should not be stored in localStorage; refresh tokens should be in httpOnly cookies when possible.

**Why it matters:** Security, compliance, real users and real data.

**Refactor (target state):**  
- Prefer **httpOnly cookie** for refresh token (set by backend on login/refresh; not readable by JS).  
- Prefer **memory-only** access token (Redux or React state, not localStorage). On page reload, use refresh token (cookie) to get a new access token.  
- If you must keep token in JS: store only in memory (Redux is OK for SPA if no persistence), and **never** persist tokens to localStorage. Remove `localStorage.setItem('auth', ...)` for tokens; persist only non-sensitive user info (e.g. username, roles) for “remember me” UX if needed.  
- Ensure all API `prepareHeaders` read the in-memory token (e.g. from Redux) and that logout clears that state and, if using cookies, calls backend to clear refresh cookie.

**Breaking change:** Yes — clients that rely on tokens in localStorage after reload will need to use refresh flow on load.

---

### 2.2 No 401 Handling / Token Refresh — CRITICAL (UX & Security)

**Location:** All RTK Query APIs use a single `baseQuery` (or per-API `fetchBaseQuery`) that only attaches `Authorization: Bearer <accessToken>`. No central handling of 401.

**Issue:** When the access token expires (15 min in config), API calls return 401. The app does not retry with a refresh token or redirect to login. User sees errors or broken UI with no clear recovery.

**Refactor:** Implement a **baseQueryWithReauth** (or use RTK Query’s pattern):  
- On response, if status === 401 and we have a refresh token, call refresh endpoint (using refresh token from cookie or, if still in memory, from a dedicated slice that does not persist it to localStorage).  
- If refresh succeeds, store new tokens and retry the original request.  
- If refresh fails or no refresh token, dispatch logout and redirect to login.  
- Ensure only one refresh runs at a time (queue other requests until refresh completes). This reduces redundant refresh calls and race conditions.

---

### 2.3 RTK Query Cache and Deduplication — GOOD

**Assessment:** Tag-based invalidation is used (e.g. `invalidatesTags: ['Task']`). Same query args deduplicate by default. No polling observed. Consider explicit `keepUnusedDataFor` if you want to shorten cache lifetime for sensitive data (e.g. tasks).

---

### 2.4 Redux State Size — LOW

**Assessment:** No createEntityAdapter; workflow/task lists are stored as returned by API (content array). For paginated data this is fine. Avoid storing full workflow/task payloads in a global normalized store if you only need them for one screen; current usage is acceptable.

---

## 3. Frontend Security

### 3.1 XSS — LOW

**Assessment:** No `dangerouslySetInnerHTML` observed. User content in tables/cards is text. Keep validating that workflow/task names and form data are escaped when rendered (React escapes by default).

### 3.2 Role-Based UI — MEDIUM

**Location:** `AdminRoute` and `Sidebar` use `roles.includes('ADMIN')` from Redux.

**Issue:** Role is derived from token/auth state. If token is forged or state is manipulated, UI can show admin links. Backend already enforces `/api/admin/**` with `hasRole('ADMIN')`, so server is the authority. UI role is for UX only; do not trust it for security.

**Recommendation:** Keep server-side enforcement. Optionally hide admin menu when backend returns 403 on first admin API call, instead of relying only on stored roles.

### 3.3 Logout — MEDIUM

**Location:** `authSlice.logout`: clears Redux state and `localStorage.removeItem('auth')`. No call to backend.

**Issue:** Server does not invalidate the refresh token (JWT is stateless, so “logout” is client-side only). Stolen refresh token remains valid until expiry.

**Refactor:** Add a backend endpoint (e.g. `POST /api/auth/logout`) that accepts refresh token and blacklists it (e.g. in Redis with TTL = token expiry). Frontend calls it on logout and then clears state/cookies. If you do not have a blacklist, at least document that “logout” only clears client state and tokens remain valid until expiry.

---

## 4. Memory & Network

### 4.1 Waterfall Requests — MEDIUM

**Location:** `TaskExecutionPage`: first `useGetTaskQuery(id)`, then `useGetPublishedWorkflowQuery(task?.workflowId ?? 0, { skip: !task?.workflowId })`.

**Issue:** Two round-trips (task then workflow). Slower first paint and more latency.

**Refactor:** Backend could expose a single endpoint (e.g. `GET /api/tasks/:id/execution` or `GET /api/tasks/:id?include=workflow`) that returns task DTO + full workflow for the current step. Frontend then uses one request. Alternatively keep two requests but use `useGetTaskQuery` and in the same hook or component request workflow only when task is available (current pattern); improving backend to one response is better for performance.

### 4.2 Cleanup — LOW

**Assessment:** No obvious missing cleanup in `useEffect` (no subscriptions or intervals observed that need cleanup). `TaskExecutionPage` useEffect has dependency `[currentStep]`; ensure it does not create stale closures (current code looks fine).

---

## 5. Bundle & Build

### 5.1 Vite Config — LOW

**Location:** `vite.config.ts`: React plugin, proxy for `/api`. No explicit chunk splitting or build optimizations.

**Recommendation:** Ensure production build uses code splitting (Vite does this by default for dynamic imports). Consider explicit `build.rollupOptions.output.manualChunks` for large deps (e.g. `@xyflow/react`, `framer-motion`) to improve cacheability. Enable gzip/Brotli on the server for static assets.

### 5.2 Source Maps — LOW

**Recommendation:** Do not serve source maps in production to avoid exposing source. Use `build.sourcemap: false` or upload source maps to an error-tracking service only.

### 5.3 Dependencies — LOW

**Assessment:** No obvious heavy unused deps. `framer-motion` and `@xyflow/react` are used. Keep dependencies updated and run `npm audit` / Dependabot for vulnerabilities.

---

# PART 3 — CONFIGURATION IMPROVEMENTS

## Backend (application.yml / production profile)

- **JWT:** No default secret in prod; fail startup if `JWT_SECRET` is unset or equals a known default. Use at least 256-bit secret.
- **HikariCP:** Already has `maximum-pool-size: 20`, `minimum-idle: 5`, `idle-timeout: 300000`. Add `connection-timeout` (e.g. 20000), `validation-timeout` (e.g. 5000). Consider `leak-detection-threshold` in dev to detect connection leaks.
- **Hibernate:** You have `default_batch_fetch_size: 20`, `batch_size: 25`, `order_inserts`/`order_updates: true`. Add `order_deletes: true` if you use batch deletes. Consider `query.in_clause_parameter_padding: true` for better plan caching with IN clauses.
- **Redis:** Already has timeout. Consider connection pool size if using Jedis/Lettuce pool. For production, use a dedicated Redis and set `REDIS_HOST`/`REDIS_PORT` via env.
- **Profiles:** Add `application-prod.yml` that: uses PostgreSQL only, disables H2 console, does not permit `/h2-console/**`, sets `spring.jpa.show-sql: false`, sets logging to INFO/WARN, and ensures no default JWT secret.
- **Actuator:** Add `management.endpoints.web.exposure.include: health,info` and exclude sensitive endpoints. Use `management.endpoint.health.show-details: when_authorized` or `never` in prod.

## Frontend (vite / env)

- **API base URL:** Prefer env (e.g. `VITE_API_URL`) for production API base instead of relative `/api`, so the same build can target different backends.
- **Build:** `sourcemap: false` for production; consider `reportCompressedSize: true` to track bundle size.

---

# PART 4 — PRIORITY MATRIX

| Priority   | Item |
|-----------|------|
| **CRITICAL** | Task/instance authorization (get task, submit, cancel by id) |
| **CRITICAL** | Token storage: remove from localStorage; prefer httpOnly cookie for refresh, memory-only access token |
| **CRITICAL** | Frontend: 401 handling and token refresh (baseQueryWithReauth) |
| **CRITICAL** | JWT secret: no default in production; fail fast if unset |
| **HIGH**     | N+1 on workflow list and task list/single task (DTO/EntityGraph) |
| **HIGH**     | H2 console: never permit in production; profile-based config |
| **HIGH**     | UserDetails cache (Redis or Caffeine) to avoid DB on every request |
| **HIGH**     | Unbounded roles list: paginate or cap |
| **MEDIUM**   | AuthService @Transactional on login/refresh |
| **MEDIUM**   | Workflow getWorkflow business rules fetch (avoid N+1) |
| **MEDIUM**   | updateWorkflow: differential step update or batch deletes |
| **MEDIUM**   | GlobalExceptionHandler: structured logging, no printStackTrace |
| **MEDIUM**   | AuthController refresh: DTO + validation; rate limit |
| **MEDIUM**   | CORS: explicit allowed headers |
| **MEDIUM**   | Frontend: code splitting (lazy routes) |
| **MEDIUM**   | Backend logout: refresh token blacklist (e.g. Redis) |
| **MEDIUM**   | Task execution: single endpoint for task + workflow to avoid waterfall |
| **LOW**      | Entity equals/hashCode (id-based) |
| **LOW**      | EAGER → LAZY + EntityGraph where needed |
| **LOW**      | Security headers (CSP, X-Content-Type-Options, etc.) |
| **LOW**      | Pagination metadata usage on frontend; max page size cap |

---

# PART 5 — DATA INTEGRITY & COMPATIBILITY

- **Backward compatibility:** Changing list endpoints from full `WorkflowDto` to `WorkflowListDto` is a **breaking API change** if clients expect full steps in list. Prefer adding new endpoints or a query param (e.g. `?projection=list`) and deprecate old behavior, or document the change and version the API.
- **Data integrity:** Task authorization must be enforced before any update (submit/cancel) to prevent one user from altering another’s instance. No other obvious integrity risks from the audit.
- **Horizontal scaling:** Stateless JWT + Redis cache is compatible with multiple instances. Ensure Redis is shared and that any in-memory cache (e.g. UserDetails) is either per-instance with short TTL or moved to Redis.

---

# PART 6 — SUMMARY OF TOP REFACTORS

1. **Backend:** Enforce task ownership in `TaskService` for getTask, submitStep, cancelTask; add DTO/EntityGraph for workflow list and task list to eliminate N+1; cache UserDetails; remove default JWT secret and guard H2 console in production; validate refresh request body; use structured logging.
2. **Frontend:** Stop storing tokens in localStorage; use httpOnly cookie for refresh and in-memory access token; implement baseQueryWithReauth for 401 and refresh flow; lazy-load admin and heavy pages.
3. **Config:** Add production profile; HikariCP timeouts and optional leak detection; Hibernate order_deletes; actuator and health exposure; frontend env for API URL and production source maps.

End of report.
