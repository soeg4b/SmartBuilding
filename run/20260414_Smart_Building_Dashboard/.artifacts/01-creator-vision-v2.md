# 01 — Creator Vision v2: Smart Building Super App Platform

> **Project Code**: `20260414_Smart_Building_Dashboard`
> **Version**: 2.0 — Platform Evolution Addendum
> **Created**: 2026-04-16
> **Supersedes**: Sections enhanced in `01-creator-vision.md` (v1, 2026-04-14)
> **Author**: Creator Agent (Stage 1)
> **Status**: Draft for Product Manager Review

---

## 1. Updated Vision Statement

### Previous Vision (v1)

> "One pane of glass to see, understand, and command every system in a smart building — from boardroom strategy to boiler room operations."

### Evolved Vision (v2)

> **"The operating system for building business — a single super app platform that unifies every building operation, enforces role-appropriate information boundaries, and scales from a handful of sensors to tens of thousands without breaking the operator's focus."**

The Smart Building Dashboard is no longer a monitoring dashboard — it is evolving into a **building operations super app/platform**. This means:

1. **Platform, not product** — extensible enough to absorb any building business function (energy, maintenance, compliance, finance, tenant management) as a module within one unified experience.
2. **IoT-grade resilience** — architected to ingest and correlate signals from thousands of sensors without overwhelming operators with noise. Intelligent alert aggregation replaces raw notification flooding.
3. **Strict information boundaries** — every pixel on screen is governed by role-based access. Users see exactly what they need and nothing more, reducing cognitive overload and preventing unauthorized information exposure.
4. **Flexible spatial intelligence** — building floor plans are living, editable documents, not static images. Operators can upload, draw, revise, and version their spatial data without developer intervention.
5. **Mobile-lean philosophy** — the mobile experience is deliberately kept lightweight, delivering only high-frequency, time-sensitive actions (alerts, checklists, lookups) without the weight of desktop-class features.

### Strategic Rationale for Platform Evolution

The v1 dashboard has proven the core value proposition. Pilot feedback reveals three operational realities that demand platform-level upgrades:

| Reality | Impact | Platform Response |
|---|---|---|
| Buildings deploy 2,000–10,000+ IoT sensors; alert volumes during incidents overwhelm operators | Operators ignore alerts → missed critical failures | IoT Alert Flood Prevention engine |
| Floor plans change as buildings are renovated; static SVGs become outdated within months | Spatial view becomes inaccurate → technicians distrust it | Flexible Drawing Collection & versioning |
| Users access information outside their role scope, creating confusion and compliance risk | CFOs confused by technical data; technicians see financial data irrelevant to their work | Strict RBAC information filtering |

---

## 2. New Feature Requirements

### 2.1 IoT Alert Flood Prevention

**Problem**: A building with 5,000 sensors can generate 500+ simultaneous alerts during a single incident (e.g., building-wide power outage, chiller cascade failure, fire alarm propagation). Current threshold-based alerting treats each sensor independently, flooding operators with individual notifications. This causes:

- Alert fatigue → operators mute notifications or ignore them
- Inability to identify root cause amid noise
- Critical alerts buried under hundreds of informational ones
- Mobile devices becoming unusable with notification storms

**Requirements**:

| ID | Requirement | Description |
|---|---|---|
| AF-1 | **Alert Aggregation/Grouping** | Correlate related alerts into a single "incident." Grouping rules based on: (a) spatial proximity (same floor/zone), (b) temporal proximity (triggered within configurable time window, default 60s), (c) causal chain (e.g., power outage → HVAC stop → temperature rise). Each incident shows count of underlying alerts, affected zones, and highest severity. |
| AF-2 | **Alert Throttling with Cooldown** | After an alert fires, suppress identical alerts from the same sensor/zone for a configurable cooldown window (default: 5 minutes for critical, 15 minutes for warning, 60 minutes for info). Cooldown resets if severity escalates. |
| AF-3 | **Storm Detection** | Auto-detect when alert volume exceeds a configurable threshold (e.g., >50 alerts in 60 seconds). When storm is detected: (a) switch UI to "storm mode" showing a summary dashboard instead of individual alerts, (b) suppress info/warning alerts, (c) surface only critical alerts, (d) auto-generate a storm report when subsided. |
| AF-4 | **Priority-Based Suppression** | During a storm or high-volume event, automatically suppress lower-priority alerts. Suppression hierarchy: Info → Warning → Critical → Emergency. Suppressed alerts are logged but not surfaced to UI or push notifications. Users can review suppressed alerts post-incident. |
| AF-5 | **Incident Correlation View** | Provide a timeline view per incident showing: root cause hypothesis (first alert in chain), propagation pattern, affected equipment/zones, and resolution status. |
| AF-6 | **Configurable Aggregation Rules** | System Administrators can define custom grouping rules: group by zone, group by equipment type, group by subsystem (HVAC, electrical, plumbing), or custom tag-based grouping. |

**Business Value**:
- Reduces operator alert volume by 80–95% during storm events
- Enables root-cause identification in minutes instead of hours
- Preserves operator trust in the alerting system
- Reduces mean time to respond (MTTR) for correlated incidents

---

### 2.2 Flexible Building/Room Drawing Collection

**Problem**: Currently floor plans are hardcoded SVG files loaded at deployment. Real-world challenges:

- Buildings undergo renovations — walls move, rooms are merged/split
- Floor plans arrive in various formats (SVG, PNG, DXF from AutoCAD, PDF from architects)
- Sensor positions change as devices are added, moved, or decommissioned
- No version history — operators cannot see what changed or roll back errors
- Adding a new building/floor requires developer intervention

**Requirements**:

| ID | Requirement | Description |
|---|---|---|
| FP-1 | **Multi-Format Upload** | Support uploading floor plan files in: SVG, PNG, JPEG, PDF (single page extracted), and DXF (AutoCAD). Server-side conversion normalizes all inputs to a renderable format (SVG preferred, rasterized fallback for unsupported vector formats). |
| FP-2 | **Building/Floor Hierarchy** | Organize floor plans in a tree structure: Organization → Building → Floor → Zones. Each node can have metadata (address, area sqm, purpose). CRUD operations for adding/removing buildings and floors. |
| FP-3 | **Room Boundary Drawing** | In-browser drawing tool to define room boundaries on top of uploaded floor plans. Support: rectangle, polygon, freeform drawing modes. Rooms can be named, tagged (office, lobby, server room, etc.), and assigned to zones. |
| FP-4 | **Sensor Placement Management** | Drag-and-drop sensor icons onto floor plans. Each placed sensor links to a sensor record in the asset database. Sensor positions are persisted and editable. Bulk import of sensor positions via CSV/JSON. |
| FP-5 | **Version History** | Every change to a floor plan (upload, room edit, sensor move) creates a versioned snapshot. Operators can view change history, compare versions side-by-side, and roll back to a previous version. |
| FP-6 | **Floor Plan Access Control** | Floor plans inherit RBAC. Technicians only see floors/zones they are assigned to. Sys Admins see all. Financial Decision Makers see building-level overviews (no granular floor plans). |

**Business Value**:
- Eliminates developer dependency for spatial data updates
- Floor plans stay accurate as buildings evolve
- Reduces onboarding time for new buildings from weeks to hours
- Enables self-service operations for System Administrators

---

### 2.3 Role-Based Information Filtering (Strict RBAC)

**Problem**: The v1 system has role-based navigation (different sidebar items per role), but the data filtering is not strict enough. Issues identified:

- Financial Decision Makers can navigate to technical pages if they know the URL
- API endpoints return full data payloads regardless of requester role
- Dashboard widgets show data irrelevant to the user's role
- Technicians see financial figures in widgets not intended for them

**Requirements — Access Control Matrix**:

#### Financial Decision Maker (CFO / Owner)

| Category | Accessible | Restricted |
|---|---|---|
| **Dashboards** | Executive overview, energy cost summary, ESG scores | Technical monitoring, system health, raw sensor data |
| **Energy** | Cost analytics (IDR), billing projections, tariff analysis, consumption trends | Real-time kWh per sensor, power factor details, equipment-level metering |
| **Reports** | Financial reports, ESG compliance, energy cost summaries (PDF/CSV) | Maintenance reports, equipment logs, HSE checklists |
| **Alerts** | Cost anomaly alerts, ESG threshold alerts | Equipment failure alerts, sensor offline alerts, maintenance alerts |
| **Spatial** | Building overview map (high-level) | Floor plans, room-level data, sensor overlays |
| **Assets** | Asset summary counts and financial depreciation | Equipment health details, maintenance history, runtime counters |
| **Users** | Own profile only | User management, role administration |
| **HSE** | ESG compliance score only | PPE checklists, daily safety forms, HSE incidents |
| **Knowledge Base** | Not accessible | — |

#### System Administrator

| Category | Accessible | Notes |
|---|---|---|
| **All modules** | Full access to every feature, page, and data point | Unrestricted |
| **User Management** | Create/edit/delete users, assign roles, assign zones | — |
| **System Config** | Alert rules, aggregation settings, automation rules, floor plan management | — |
| **Audit Logs** | Full access to all audit trails | — |

#### Technician

| Category | Accessible | Restricted |
|---|---|---|
| **Dashboards** | Simplified operational dashboard (assigned zones only) | Executive dashboard, financial views, ESG scores |
| **Energy** | Not accessible | All energy/financial data |
| **Reports** | Work order reports, maintenance logs (own work only) | Financial reports, cost analytics, ESG reports |
| **Alerts** | Alerts for assigned zones/equipment only | System-wide alert management, alert rule configuration |
| **Spatial** | Floor plans for assigned floors only | Unassigned floors, building-wide maps |
| **Assets** | Assigned equipment only — health status, runtime, maintenance history | Unassigned equipment, financial depreciation data |
| **Users** | Own profile only | User management |
| **HSE** | Daily PPE checklist submission, personal HSE history | HSE administration, other users' checklists |
| **Knowledge Base** | Full access (read-only) | Knowledge Base administration |

**Requirements**:

| ID | Requirement | Description |
|---|---|---|
| RBAC-1 | **API-Level Enforcement** | Every API endpoint must validate the requester's role AND data scope (assigned zones/equipment). Unauthorized data must never leave the server — filtering happens at the query level, not in the UI. |
| RBAC-2 | **UI Component Filtering** | Dashboard widgets, navigation items, and page sections render conditionally based on role. No hidden-but-present elements — components that a role cannot access must not be included in the client bundle for that role. |
| RBAC-3 | **Zone/Equipment Assignment** | Technicians are assigned to specific zones and equipment by a Sys Admin. All data queries for technicians are automatically scoped to their assignments. |
| RBAC-4 | **URL/Route Protection** | Direct URL access to restricted pages must redirect to the user's permitted home page with an appropriate message. No security-through-obscurity. |
| RBAC-5 | **Data Scope in API Responses** | API responses must strip restricted fields based on role. Example: Asset list for a Financial Decision Maker returns asset name and depreciation value but omits maintenance history and runtime counters. |
| RBAC-6 | **Audit Trail for Access Control** | Log all access-denied events for security monitoring. Alert Sys Admins on repeated unauthorized access attempts. |

**Business Value**:
- Reduces cognitive overload — users see only what matters to them
- Prevents unauthorized data exposure (financial data to technicians, technical noise to executives)
- Meets compliance requirements for role separation in regulated buildings (hospitals, data centers)
- Simplifies user training — each role has a focused, purpose-built experience

---

### 2.4 Mobile-Lean Philosophy

**Problem**: As the platform grows into a super app with more modules, there is a real risk the mobile experience becomes bloated. Heavy features (floor plan editors, 3D views, complex report builders) should not be forced into mobile browsers where they degrade performance and usability.

**Principles**:

| Principle | Rationale |
|---|---|
| **Mobile is for action, desktop is for analysis** | Mobile users are typically in-context (walking the building, responding to alerts). They need fast actions, not deep analysis. |
| **Maximum 3-second load time** | Mobile pages must load in under 3 seconds on mid-range Android devices over 4G. |
| **Thumb-friendly interactions** | All mobile interactions must be achievable with one-thumb operation. No fine-grained drag-drop or hover interactions. |
| **Offline-resilient actions** | HSE checklist submissions and alert acknowledgments should queue locally if connectivity drops and sync when restored. |

**Mobile Feature Scope**:

| Feature | Mobile | Desktop |
|---|---|---|
| Dashboard overview (role-appropriate) | ✅ Simplified cards | ✅ Full widgets |
| Alert notifications & acknowledge | ✅ Push + in-app | ✅ Full alert management |
| HSE daily checklist submission | ✅ Optimized form | ✅ Form + admin view |
| Equipment lookup (search + status) | ✅ Search + G/Y/R card | ✅ Full asset detail |
| Floor plan viewing (read-only, simple) | ✅ Pan/zoom, tap sensor | ✅ Full interactive |
| Floor plan editing / room drawing | ❌ Desktop only | ✅ Full editor |
| Report generation / download | ❌ Desktop only | ✅ Full reports |
| User management | ❌ Desktop only | ✅ Full admin |
| Automation rule builder | ❌ Desktop only | ✅ Full builder |
| 3D Digital Twin | ❌ Desktop only | ✅ Three.js |
| Alert rule configuration | ❌ Desktop only | ✅ Full config |
| What-If simulation | ❌ Desktop only | ✅ Full simulation |
| Energy deep analytics | ❌ Desktop only | ✅ Full analytics |

**Requirements**:

| ID | Requirement | Description |
|---|---|---|
| MOB-1 | **Lazy Loading** | Mobile views load only the components needed for the current page. No preloading of desktop-only features. |
| MOB-2 | **Responsive Breakpoint Strategy** | Desktop-only features do not render below 768px. No hidden-overflow or scroll-to-find patterns for mobile-inappropriate content. |
| MOB-3 | **Push Notifications** | Critical and high-priority alerts push to mobile devices via Web Push API or service worker. Respects alert throttling from AF-2. |
| MOB-4 | **Offline Queue** | HSE checklist submissions and alert acknowledgments are queued in local storage when offline, auto-synced when connectivity resumes. Conflict resolution favors the most recent action. |
| MOB-5 | **Performance Budget** | Mobile bundle size must not exceed 300KB gzipped for initial load. Subsequent lazy-loaded chunks max 100KB each. |

---

## 3. Updated User Personas & Access Matrix

### Persona 1 (Updated): Budi Santoso — CFO / Financial Decision Maker

- **Sees**: Executive dashboard, energy costs in IDR, billing projections, ESG compliance scores, financial reports, cost anomaly alerts
- **Does NOT see**: Equipment health details, raw sensor data, maintenance logs, HSE checklists, floor plans with sensor overlays, knowledge base, system configuration, user management
- **Mobile**: Dashboard summary cards (cost KPIs, ESG headline), cost anomaly push notifications
- **Alert behavior**: Receives only cost anomaly and ESG threshold alerts. During IoT storms, receives a single "incident summary" notification, not individual sensor alerts.

### Persona 2 (Updated): Rina Wijaya — System Administrator

- **Sees**: Everything. All modules, all data, all configuration.
- **Does NOT see**: Nothing restricted.
- **Mobile**: Alert management (acknowledge/assign), equipment quick lookup, dashboard overview
- **Alert behavior**: Receives all critical/emergency alerts. During storms, sees storm summary dashboard with incident correlation view. Can drill into suppressed alerts. Configures aggregation rules, cooldown windows, and storm thresholds.

### Persona 3 (Updated): Agus Pratama — Technician

- **Sees**: Assigned equipment health (G/Y/R), assigned floor plans (read-only, tap-to-inspect), work orders for assigned zones, HSE daily checklist, knowledge base (read-only), personal maintenance history
- **Does NOT see**: Financial data (energy costs, billing, budgets), executive dashboard, ESG reports, unassigned equipment/floors, user management, system settings, alert rule configuration, automation engine
- **Mobile**: HSE checklist submission (primary mobile use case), alert notifications for assigned equipment, equipment lookup by QR/search, simplified floor plan viewer for assigned floors
- **Alert behavior**: Receives alerts only for assigned zones and equipment. During storms, receives aggregated incident notification relevant to assigned zones only. Cannot acknowledge storm-level incidents (escalated to Sys Admin).

### Consolidated Access Matrix

| Module / Feature | Financial Decision Maker | System Administrator | Technician |
|---|---|---|---|
| Executive Dashboard | ✅ Full | ✅ Full | ❌ |
| Energy Costs & Billing | ✅ Full | ✅ Full | ❌ |
| Energy Technical (kWh/sensor) | ❌ | ✅ Full | ❌ |
| Environmental Monitoring | Summary only | ✅ Full | Assigned zones only |
| Asset/Equipment List | Summary + depreciation | ✅ Full | Assigned equipment only |
| Equipment Health & Maintenance | ❌ | ✅ Full | Assigned equipment only |
| Floor Plans (view) | Building overview only | ✅ All floors | Assigned floors only |
| Floor Plans (edit/draw) | ❌ | ✅ Full | ❌ |
| Sensor Placement | ❌ | ✅ Full | ❌ |
| Alert Management | Cost alerts only | ✅ Full + config | Assigned zone alerts only |
| Alert Rule Configuration | ❌ | ✅ Full | ❌ |
| Storm/Incident View | Summary notification | ✅ Full + drill-down | Assigned zone summary |
| HSE Checklist | ❌ | ✅ Admin view | ✅ Submit + history |
| Knowledge Base | ❌ | ✅ Full + admin | ✅ Read-only |
| Reports (Financial) | ✅ Full | ✅ Full | ❌ |
| Reports (Maintenance) | ❌ | ✅ Full | Own work orders only |
| Reports (ESG) | ✅ Full | ✅ Full | ❌ |
| User Management | ❌ | ✅ Full | ❌ |
| System Configuration | ❌ | ✅ Full | ❌ |
| Audit Logs | ❌ | ✅ Full | ❌ |
| Mobile Access | ✅ (KPI cards) | ✅ (Alerts + lookup) | ✅ (HSE + alerts + lookup) |

---

## 4. Risk Analysis for IoT Scale & Platform Evolution

### IoT Scale Risks

| Risk ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| IoT-1 | **Alert aggregation false grouping** — unrelated alerts incorrectly grouped into one incident, masking independent failures | Medium | High | Configurable grouping rules with spatial, temporal, and causal dimensions. Allow Sys Admins to split/merge incidents manually. Provide "ungrouped alerts" fallback view. |
| IoT-2 | **Storm detection false positives** — normal high-activity periods (building startup, scheduled maintenance) trigger storm mode unnecessarily | Medium | Medium | Allow scheduled maintenance windows that suppress storm detection. Learning mode that establishes baseline alert volumes per time-of-day/day-of-week. |
| IoT-3 | **Alert suppression hides real failures** — a genuinely critical alert is suppressed because it occurs during a storm | Medium | High | Emergency-severity alerts are NEVER suppressed. Critical alerts are only suppressed if an identical alert from the same sensor is already active. Suppressed alert log is always accessible. |
| IoT-4 | **Message broker backpressure** — thousands of sensors publishing simultaneously overwhelm MQTT broker and backend ingestion | Medium | High | Horizontal scaling of MQTT broker (clustered EMQX/VerneMQ). Backend uses message queuing (Redis Streams/BullMQ) to decouple ingestion from processing. Backpressure monitoring with auto-scaling triggers. |
| IoT-5 | **Time-series storage explosion** — 10,000 sensors at 1-second intervals = 864M data points/day | High | High | Aggressive retention policies: raw data 7 days, 1-min aggregates 90 days, 15-min aggregates 1 year, hourly aggregates indefinite. TimescaleDB continuous aggregates and compression. |

### Platform Evolution Risks

| Risk ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| PE-1 | **Super app scope creep** — "platform for all building business" becomes an excuse to absorb unrelated features | High | High | Strict module boundary governance. Each new module must pass a "building operations relevance" test. Product Manager maintains a module acceptance checklist. |
| PE-2 | **RBAC complexity explosion** — as modules multiply, maintaining access matrices becomes error-prone | Medium | High | Centralize RBAC in a policy engine (not scattered across endpoint handlers). Use policy-as-code approach. Automated RBAC test suite that validates the access matrix on every deployment. |
| PE-3 | **Floor plan editor becomes a CAD tool** — scope creep in spatial features leads to reimplementing AutoCAD in the browser | Medium | Medium | Limit drawing tools to room boundaries and sensor placement. No architectural drawing capabilities (wall thickness, plumbing, structural elements). Import those from CAD files. |
| PE-4 | **Mobile performance degradation** — despite lean philosophy, incremental feature additions gradually bloat the mobile bundle | Medium | Medium | Automated performance budget enforcement in CI. Mobile bundle size check fails the build if exceeding 300KB gzipped. Lighthouse performance score gate ≥ 85. |
| PE-5 | **Data leakage through aggregated views** — financial data leaks to technicians through derived metrics or shared dashboard components | Low | High | All data aggregation happens server-side with role-aware queries. UI components receive pre-filtered payloads. Penetration testing specifically targeting RBAC bypass scenarios. |

---

## 5. Success Metrics for Enhancements

### IoT Alert Flood Prevention Metrics

| Metric | Target | Measurement |
|---|---|---|
| Alert volume reduction during storm events | ≥ 90% reduction in notifications surfaced to operators | Compare raw alert count vs. aggregated incident count during storm events |
| Mean time to identify root cause | ≤ 5 minutes from storm onset | Timestamp of storm detection to operator identifying root cause in incident correlation view |
| False grouping rate | < 5% of incidents contain incorrectly grouped alerts | Monthly audit of incident reports by Sys Admins |
| Storm detection accuracy | ≥ 95% true positive rate for storm detection | Compare auto-detected storms vs. manually confirmed storms |
| Critical alert delivery during storms | 100% of emergency/critical alerts delivered within 30 seconds | End-to-end latency measurement from sensor event to operator notification |

### Flexible Floor Plan Management Metrics

| Metric | Target | Measurement |
|---|---|---|
| Time to onboard a new building | ≤ 4 hours (from floor plan upload to live sensor overlay) | Onboarding workflow timer |
| Floor plan update frequency | Self-service updates without developer involvement | Count of floor plan changes made by Sys Admins without engineering tickets |
| Supported format success rate | ≥ 95% of uploaded files render correctly | Upload success/failure ratio |
| Version history utilization | ≥ 1 rollback per building per quarter | Rollback event tracking |
| Sensor placement accuracy | ≤ 2 meters discrepancy between placed and physical location | Spot-check audits during building walkthroughs |

### Strict RBAC Metrics

| Metric | Target | Measurement |
|---|---|---|
| Unauthorized data exposure | Zero incidents of cross-role data leakage | Security audit + penetration test results |
| API endpoint coverage | 100% of API endpoints enforce role + scope checks | Automated RBAC test suite coverage |
| Unauthorized access attempts blocked | 100% of direct URL / API bypass attempts rejected | Access-denied event logs |
| User satisfaction by role | ≥ 85% of users report seeing "only relevant information" | User survey |
| RBAC policy sync accuracy | 100% alignment between documented access matrix and implemented policy | Automated policy-vs-matrix validation test |

### Mobile-Lean Performance Metrics

| Metric | Target | Measurement |
|---|---|---|
| Mobile initial load time | ≤ 3 seconds on 4G with mid-range Android | Lighthouse / WebPageTest |
| Mobile bundle size (gzipped) | ≤ 300KB initial load | CI bundle size check |
| Lighthouse performance score (mobile) | ≥ 85 | Automated Lighthouse in CI |
| Offline checklist sync success | ≥ 99% of queued submissions sync successfully | Sync success/failure logs |
| Mobile user session crash rate | < 0.5% | Error monitoring (Sentry / equivalent) |

---

## 6. Updated Product Scope Direction

### Enhanced MVP+ (Current Phase — Immediate Implementation)

The following enhancements apply to the current working codebase:

| Enhancement Area | MVP+ Scope | Deferred |
|---|---|---|
| **Alert Flood Prevention** | Alert grouping by zone + time window, configurable cooldown, basic storm detection (volume threshold), priority suppression | Causal chain analysis, ML-based correlation, incident root cause hypothesis |
| **Floor Plan Collection** | Multi-format upload (SVG, PNG, PDF), building/floor hierarchy CRUD, room boundary drawing (rectangle + polygon), drag-drop sensor placement, basic version history | DXF/AutoCAD import, side-by-side version comparison, bulk sensor import |
| **Strict RBAC** | Full access matrix enforcement at API + UI level for 3 roles, zone/equipment assignment for technicians, URL route protection, field-level response filtering | Dynamic role creation, custom permission sets, attribute-based access control (ABAC) |
| **Mobile-Lean** | Responsive breakpoint enforcement, lazy loading, performance budget CI gate, HSE offline queue | Push notifications (Web Push API), PWA install prompt |

### Phase 2+ Expansion (Deferred — Post Validation)

- Causal chain alert correlation using dependency graphs
- ML-based storm pattern recognition and predictive storm warning
- DXF/AutoCAD native import with layer extraction
- Floor plan annotation and markup tools for technicians
- Attribute-Based Access Control (ABAC) for complex multi-tenant scenarios
- Push notification service worker for mobile alerts
- PWA installable experience with offline dashboard caching

---

## 7. Guidance to Product Manager

### Immediate PM Decisions Required

1. **Alert aggregation time window default** — Recommend 60 seconds but needs validation with Sys Admin persona. Is 60s too aggressive (groups unrelated alerts) or too conservative (doesn't group fast-propagating failures)?

2. **Storm detection threshold** — Propose >50 alerts in 60 seconds as the default storm trigger. PM must validate with real-world building data: what is "normal" alert volume during peak hours?

3. **Floor plan format priority** — SVG and PNG are straightforward. PDF extraction and DXF import have significant complexity. PM should confirm which formats are actually used by target customers to prioritize implementation order.

4. **RBAC strictness vs. usability trade-off** — The proposed matrix is strict. Should Financial Decision Makers have read-only access to a simplified equipment summary (asset count, overall health %) for context, or is strict separation preferred?

5. **Mobile offline scope** — Currently scoped to HSE checklists and alert acknowledgments. Should equipment status lookup also work offline (requires local data caching)?

### Questions Requiring Stakeholder Validation

1. Do existing pilot buildings have >1,000 sensors, or is IoT scale a future requirement that should be architected now but not performance-tested until Phase 2?

2. Are there regulatory requirements for role separation in any target building categories (hospitals, data centers) that dictate specific RBAC patterns?

3. What floor plan formats do current prospects actually have? Confirm SVG/PNG/PDF/DXF priority order with 5+ prospects.

4. Should the mobile experience support push notifications in MVP+, or is in-app notification sufficient?

5. Is there a requirement for a "delegate" or "temporary access" model (e.g., a technician temporarily elevated to see additional floors during an emergency)?

### Recommended Next Strategic Checkpoints

| Checkpoint | Timing | Decision |
|---|---|---|
| Alert aggregation prototype review | After AF-1/AF-2 implementation | Validate grouping accuracy with real alert data from pilot buildings |
| RBAC matrix sign-off | Before implementation begins | Stakeholder confirmation that the access matrix is correct and complete |
| Floor plan editor usability test | After FP-3/FP-4 implementation | Test with 3 Sys Admins: can they onboard a new floor in < 1 hour? |
| Mobile performance gate | After MOB-1/MOB-5 implementation | Verify 3-second load benchmark on target devices |
| Storm simulation test | After AF-3/AF-4 implementation | Simulate 500-alert storm and verify operator experience |

---

## 8. Handoff

- **Inputs consumed**: Original `01-creator-vision.md` (v1), user enhancement requirements (4 areas: IoT alert flood prevention, flexible floor plans, strict RBAC, mobile-lean philosophy)
- **Outputs produced**: `.artifacts/01-creator-vision-v2.md` (this document)
- **Open questions**:
  1. Exact alert aggregation time window and storm detection thresholds need real-world calibration
  2. DXF/AutoCAD import complexity — may need third-party library evaluation
  3. RBAC matrix completeness — are there edge cases for cross-role scenarios (e.g., CFO who is also building owner)?
  4. Push notification strategy (Web Push vs. native wrapper) for mobile alerts
  5. Temporary role elevation model for emergency scenarios
- **Go/No-Go**: **GO** — Recommend Product Manager proceed with roadmap planning for all 4 enhancement areas. Alert flood prevention and strict RBAC are highest priority (operational risk mitigation). Floor plan collection is high value for onboarding efficiency. Mobile-lean is a guardrail that should be enforced from the start, not retrofitted.
