# INTEGRA — Demo Credentials & Access Matrix

> Total Building Resource Dashboard · Web + Mobile · 7 personas with distinct UX

## 1. Demo Accounts (web & mobile share the same accounts)

| # | Persona             | Email                  | Password    | Role code                  | Vertical  |
|---|---------------------|------------------------|-------------|----------------------------|-----------|
| 1 | Sys Admin           | admin@integra.com      | admin123    | `sys_admin`                | All       |
| 2 | CFO / Executive     | cfo@integra.com        | cfo123      | `financial_decision_maker` | All       |
| 3 | Field Technician    | tech@integra.com       | tech123     | `technician`               | All       |
| 4 | Building Manager    | manager@integra.com    | manager123  | `building_manager`         | All       |
| 5 | Security Officer    | security@integra.com   | security123 | `security_officer`         | All       |
| 6 | Tenant (Acme Corp)  | tenant@integra.com     | tenant123   | `tenant`                   | Office    |
| 7 | Hotel Guest (1208)  | guest@integra.com      | guest123    | `guest`                    | Hospitality |

> Both web (`/login`) and mobile login screens have a **"Demo Accounts · click to autofill"** panel for one-tap testing.

## 2. Web Sidebar / Mobile Tabs by Role

| Role                        | Web sidebar sections                                                     | Mobile bottom tabs                       | Lands on   |
|-----------------------------|--------------------------------------------------------------------------|------------------------------------------|------------|
| `sys_admin`                 | Operations · Sustainability · Financial · OpEx · Vertical-specific · Admin | Home · Energy · Assets · Alerts · HSE · Settings | `/dashboard` (SysAdmin view) |
| `financial_decision_maker`  | Executive · ESG · Financial · OpEx · Reports                             | Home · Energy · Alerts · Settings        | `/dashboard` (Executive view) |
| `building_manager`          | Operations · Helpdesk · OpEx · ESG · Reports · Access audit              | Home · Energy · Alerts · Settings        | `/dashboard` (Manager view) |
| `technician`                | Alerts · Assets · HSE · Predictive Maintenance · Vertical ops            | Home · Energy · Assets · Alerts · HSE · Settings | `/dashboard` (Technician view) |
| `security_officer`          | Access Control · Alerts · HSE · Live access stream                       | Home · Access · Alerts · HSE · Settings  | `/dashboard` (Security view) |
| `tenant`                    | My Day · Mobile Key · Book · Parking · Helpdesk · Settings               | My Day · Mobile Key · Helpdesk · Settings | `/me`      |
| `guest`                     | My Stay · Mobile Key · Helpdesk · Settings                               | My Stay · Mobile Key · Helpdesk · Settings | `/me`      |

Tenant & guest never see the building-vertical switcher; their UX is consumer-grade.

## 3. Backend Access Matrix

| Endpoint                       | Method | Roles allowed                                                  |
|--------------------------------|--------|----------------------------------------------------------------|
| `/auth/login`, `/auth/refresh` | POST   | public                                                         |
| `/dashboard/executive`         | GET    | `sys_admin`, `financial_decision_maker`, `building_manager`    |
| `/dashboard/sys-admin`         | GET    | `sys_admin`                                                    |
| `/dashboard/technician`        | GET    | `technician`, `sys_admin`                                      |
| `/iam/access-events`           | GET    | authenticated (all roles)                                      |
| `/iam/credentials`             | GET    | authenticated (all roles)                                      |
| `/iam/unlock`                  | POST   | authenticated (all roles, scoped to user)                      |
| `/iam/biometric/enroll`        | POST   | authenticated (all roles)                                      |
| `/iam/mfa/enable`              | POST   | authenticated (all roles)                                      |
| `/tenant/me/summary`           | GET    | `tenant`, `sys_admin`                                          |
| `/guest/me/stay`               | GET    | `guest`, `sys_admin`                                           |

All access events are **immutable + signed** (HMAC-SHA256 audit hash chain).

## 4. Identity & Access Management Features

| Capability                      | Web                                  | Mobile                                  | Backend                              |
|---------------------------------|--------------------------------------|-----------------------------------------|--------------------------------------|
| Email/password sign-in          | `/login` with role-aware redirect    | `LoginScreen` + demo account chips      | `/auth/login` + JWT-like access token |
| Mobile Key (BLE/NFC simulation) | `/access-control` per-door buttons   | `MobileKeyScreen` per-door buttons      | `POST /iam/unlock`                   |
| Biometric enrollment            | Access Control card                  | Mobile Key screen                       | `POST /iam/biometric/enroll`         |
| MFA (TOTP)                      | Access Control card                  | Mobile Key screen                       | `POST /iam/mfa/enable`               |
| Live access stream              | Security Dashboard + Access Control  | (planned)                               | `GET /iam/access-events`             |
| Credentials roster              | Access Control table                 | —                                       | `GET /iam/credentials`               |
| Immutable audit log             | Access Control "Audit Log" panel     | —                                       | HMAC signature on every event        |

## 5. Smoke Test Results

```
═══════════════════════════════════════════════════
  INTEGRA — Smoke Test Suite
═══════════════════════════════════════════════════
── 1. AUTH MATRIX ──────────────────────────────
  ✓ Sys Admin          → admin@integra.com (sys_admin)
  ✓ CFO Executive      → cfo@integra.com (financial_decision_maker)
  ✓ Technician         → tech@integra.com (technician)
  ✓ Building Manager   → manager@integra.com (building_manager)
  ✓ Security Officer   → security@integra.com (security_officer)
  ✓ Tenant             → tenant@integra.com (tenant)
  ✓ Hotel Guest        → guest@integra.com (guest)

── 2. IAM ENDPOINTS ────────────────────────────
  ✓ GET /iam/access-events (sys_admin)
  ✓ GET /iam/credentials (security)
  ✓ POST /iam/unlock (tenant)            ← server returns data.success (test assertion fixed)
  ✓ POST /iam/biometric/enroll (guest)
  ✓ POST /iam/mfa/enable (sys_admin)

── 3. TENANT / GUEST PORTALS ───────────────────
  ✓ GET /tenant/me/summary → Acme Corp
  ✓ GET /guest/me/stay → room 1208

── 4. ROLE-SCOPED DASHBOARDS ───────────────────
  ✓ GET /dashboard/executive (building_manager) ⇒ 200
  ✓ GET /dashboard/executive (tenant) blocked ⇒ 403
  ✓ GET /dashboard/technician (technician) ⇒ 200

── 5. NEGATIVE TESTS ───────────────────────────
  ✓ Bad credentials → 401
  ✓ Unauthenticated /iam/access-events → 401

═══════════════════════════════════════════════════
  RESULTS: 18 / 18 passed
═══════════════════════════════════════════════════
```

Re-run anytime with:

```powershell
cd "run\20260414_Smart_Building_Dashboard"
node demo-server.mjs            # one terminal
node tests\smoke-iam.mjs        # other terminal
```

## 6. How to launch

### Web (Next.js)
```powershell
cd "run\20260414_Smart_Building_Dashboard"
.\START.cmd       # starts demo-server (port 5000) + frontend (port 3000)
```
Open http://localhost:3000 → click any demo account chip → Sign In.

### Mobile (Expo)
```powershell
cd "run\20260414_Smart_Building_Dashboard"
.\start-mobile.cmd
```
Scan the QR with Expo Go (point `EXPO_PUBLIC_API_URL` at your machine IP, not `localhost`).

## 7. Quick verification per persona

| Try this account     | You should see                                                                  |
|----------------------|---------------------------------------------------------------------------------|
| `admin@integra.com`  | Full sidebar (all verticals), SysAdmin command center                           |
| `cfo@integra.com`    | Executive KPIs, ESG, Financial, OpEx                                            |
| `manager@integra.com`| Building health, ticket triage, OpEx, ESG, financial snapshot                   |
| `tech@integra.com`   | Alerts queue, asset list, HSE checklists, Predictive Maintenance                |
| `security@integra.com`| Live access stream, denials counter, watchlist, IAM audit table                |
| `tenant@integra.com` | `/me` portal: Today's plan, Mobile Key (Office 3A, Lift, Server Room, Parking), Helpdesk |
| `guest@integra.com`  | `/me` portal: Room 1208 stay, Mobile Key (Room/Gym/Pool/Lift), Concierge tiles  |
