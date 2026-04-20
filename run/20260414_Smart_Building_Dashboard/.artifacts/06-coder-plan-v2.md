# 06 — Coder Plan v2: Platform Enhancement Implementation

> **Project Code**: `20260414_Smart_Building_Dashboard`
> **Version**: 2.0
> **Created**: 2026-04-16
> **Author**: Coder Agent (Stage 6)
> **Status**: Complete — Ready for QA

---

## 1. Implementation Plan

### Scope
7 tasks implemented across backend (`demo-server.mjs`) and frontend (Next.js 14):
1. **Backend — IoT Alert Flood Prevention**: Storm detection state, incidents, aggregation rules, 7 new API endpoints
2. **Backend — Flexible Floor Plan Management**: Upload, update, delete, room management, sensor placement, version tracking
3. **Backend — Strict RBAC Enforcement**: `checkAccess()` middleware applied to ALL 30+ protected routes
4. **Frontend — Alert Incidents Page**: New page with storm banner, incident cards, timeline expansion, resolve action
5. **Frontend — Floor Plan Upload Dialog**: Upload modal, version badges, delete buttons (sys_admin only)
6. **Frontend — RBAC Navigation Updates**: Sidebar "Incidents" nav item, role-based mobile bottom nav
7. **Frontend — Mobile Optimization**: `useIsMobile` hook created

### Files Modified
| File | Action | Description |
|------|--------|-------------|
| `demo-server.mjs` | Modified | Added ~200 lines: data structures, RBAC, 10+ new route handlers |
| `src/frontend/src/app/(dashboard)/alerts/incidents/page.tsx` | Created | Alert incidents page with storm banner and timeline |
| `src/frontend/src/app/(dashboard)/floor-plans/page.tsx` | Modified | Upload modal, version badges, delete buttons |
| `src/frontend/src/components/layout/AppSidebar.tsx` | Modified | Added "Incidents" nav item with Activity icon |
| `src/frontend/src/components/layout/BottomNav.tsx` | Modified | Role-specific mobile bottom nav items |
| `src/frontend/src/hooks/useIsMobile.ts` | Created | Responsive breakpoint hook |

### Dependencies
No new dependencies added. Backend remains zero-dependency (node:http, node:crypto only).

---

## 2. Source Code Summary

### Backend Implementation
- **Data Structures**: `STORM_STATE`, `THROTTLE_CONFIG`, `INCIDENTS[]`, `ALERT_AGGREGATION_RULES[]`, `STORM_DIGEST_BUFFER[]`
- **Functions**: `seedIncidents()`, `getAssignedZones(user)`, `checkAccess(allowedRoles)`
- **Alert Enhancement**: `sensorType`, `floorId`, `zoneId` added to every alert
- **Version Tracking**: `versions[]` array added to all `FLOOR_PLANS` entries
- **RBAC**: Every protected route now checks role via `checkAccess()`

### Frontend Implementation
- **Incidents Page**: Storm status banner (red/green), filterable incident list, expandable timeline, resolve action
- **Floor Plans Page**: Upload modal (floor select, label, SVG paste), version badge on floors, delete button
- **AppSidebar**: New "Incidents" item (`/alerts/incidents`) with Activity icon, roles: sys_admin + technician
- **BottomNav**: Completely rewritten with per-role item arrays (admin: Dashboard/Alerts/Energy/Reports, financial: Dashboard/Energy/Reports/Settings, technician: Dashboard/Alerts/HSE/Assets)

---

## 3. API Endpoints

### New Endpoints
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/alerts/storm-status` | Get storm state + throttle config | sys_admin, technician |
| GET | `/alerts/incidents` | List incidents (paginated, filtered) | sys_admin, technician |
| GET | `/alerts/incidents/:id` | Incident detail with timeline | sys_admin, technician |
| PATCH | `/alerts/incidents/:id/resolve` | Resolve incident + grouped alerts | sys_admin, technician |
| GET | `/alerts/rules` | List aggregation rules | sys_admin |
| POST | `/alerts/rules` | Create aggregation rule | sys_admin |
| PUT | `/alerts/storm-config` | Update throttle config | sys_admin |
| POST | `/floor-plans` | Upload new floor plan | sys_admin |
| PUT | `/floor-plans/:id` | Update floor plan | sys_admin |
| DELETE | `/floor-plans/:id` | Delete floor plan | sys_admin |
| POST | `/floor-plans/:id/rooms` | Add room to floor plan | sys_admin |
| PUT | `/floor-plans/:id/sensors/:sensorId` | Update sensor position | sys_admin |

### RBAC Applied to Existing Endpoints
| Path Pattern | Allowed Roles |
|-------------|---------------|
| `/dashboard/executive` | sys_admin, financial_decision_maker |
| `/dashboard/operations` | sys_admin |
| `/dashboard/technician` | sys_admin, technician |
| `/energy/*` | sys_admin, financial_decision_maker |
| `/zones/*` | sys_admin, technician |
| `/equipment/*` | sys_admin, technician |
| `/alerts/*` | sys_admin, technician |
| `/floor-plans` (GET) | all authenticated |
| `/floor-plans` (write) | sys_admin |
| `/reports/*` | sys_admin, financial_decision_maker |
| `/users/*` | sys_admin |
| `/knowledge-base/*` | sys_admin, technician |
| `/hse/*` | sys_admin, technician |
| `/buildings/*` | all authenticated |

---

## 4. Quality and Performance

- **RBAC Coverage**: 100% of protected routes have role checks returning 403 for unauthorized access
- **Zone Filtering**: Technicians see only alerts/incidents from assigned zones (z1-z4)
- **Error Handling**: All new endpoints return structured error responses `{ error: { code, message } }`
- **Input Validation**: Floor plan upload validates required fields (floorId, label)
- **TypeScript**: Zero compile errors across all modified/created frontend files

---

## 5. Setup Instructions

```bash
# Start backend
cd run/20260414_Smart_Building_Dashboard
node demo-server.mjs          # http://localhost:5000

# Start frontend
cd src/frontend
npm install
npx next dev -p 5001          # http://localhost:5001
```

---

## 6. Collaboration Handoff

### QA Validation Checklist
- [ ] Verify all 12 new API endpoints respond correctly
- [ ] Verify RBAC returns 403 for unauthorized roles on every protected route
- [ ] Verify technician zone filtering on alerts and incidents
- [ ] Verify incidents page renders storm banner, cards, and timeline
- [ ] Verify floor plan upload/delete works for sys_admin only
- [ ] Verify version badges display on floor plan selector
- [ ] Verify mobile bottom nav shows correct items per role
- [ ] Verify "Incidents" appears in sidebar for sys_admin and technician only

### Security Review Touchpoints
- RBAC enforcement on all routes
- Input validation on POST/PUT endpoints
- No secrets exposed in new endpoints

---

## 7. Handoff

- **Inputs consumed**: `.artifacts/03-sa-system-design-v2.md`
- **Outputs produced**: `.artifacts/06-coder-plan-v2.md`, `demo-server.mjs` (modified), `src/frontend/src/app/(dashboard)/alerts/incidents/page.tsx` (new), `src/frontend/src/app/(dashboard)/floor-plans/page.tsx` (modified), `src/frontend/src/components/layout/AppSidebar.tsx` (modified), `src/frontend/src/components/layout/BottomNav.tsx` (modified), `src/frontend/src/hooks/useIsMobile.ts` (new)
- **Open questions**: None
- **Go/No-Go**: **GO** — All endpoints tested, zero TypeScript errors, RBAC verified
