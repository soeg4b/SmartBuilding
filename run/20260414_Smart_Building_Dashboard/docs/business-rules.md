# Business Rules — Financial, Operational Excellence & Hospitality

Source of truth for KPI formulas exposed by the demo backend (`demo-server.mjs`)
and rendered by the frontend pages. Each KPI returns a `formula` field so the
UI can show the rule on hover / inside drill-down modals.

---

## 1. Financial Optimization (`/financial/*`)

**Allowed roles:** `sys_admin`, `financial_decision_maker`, `building_manager`.

| KPI | Formula | Source |
|---|---|---|
| Energy Cost Savings YoY | `(lastYearKwh − thisYearKwh) × tariffPerKwh` | `FIN_BASELINE` |
| Revenue Leakage Detected | `Σ(parking + booking + energyReimb + fnb anomalies)` over last 30d | `FIN_LEAKAGE` |
| OPEX Reduction | `(baselineOpex − currentOpex) / baselineOpex × 100` (sign-flipped, displayed as negative) | `FIN_BASELINE` |
| Building ROI | `annualNOI / assetBookValue × 100` | `FIN_BASELINE` |

**Endpoints**
- `GET /api/v1/financial/summary` — KPI block + raw inputs
- `GET /api/v1/financial/cost-savings` — per-category waterfall (HVAC, Lighting, Parking, F&B, Other)
- `GET /api/v1/financial/leakage` — per-source detection list with `evidence` field

**Drill-down rules**
- Cost Savings: each row shows `baseline`, `current`, `savings`, `sharePct`.
- Leakage: each row shows `amount`, `count`, `evidence` (audit reference).

---

## 2. Operational Excellence (`/operational-excellence/*`)

**Allowed roles:** `sys_admin`, `building_manager`, `financial_decision_maker` (read summary). `technician` only sees asset-health and work-orders.

| KPI | Formula |
|---|---|
| MTTR (min) | `avg(resolvedAt − triggeredAt)` over closed work orders, last 30d |
| Building Health Score | `Σ weight(green=100, yellow=60, red=10) / N(equipment)` |
| Tenant Satisfaction % | `(promoters / totalRespondents) × 100` |
| NPS | `% promoters − % detractors` |
| SLA Compliance % | `(workOrdersOnTime / totalWorkOrders) × 100` |

**Endpoints**
- `GET /operational-excellence/summary`
- `GET /operational-excellence/asset-health`
- `GET /operational-excellence/nps-trend`
- `GET /operational-excellence/work-orders`

---

## 3. Hospitality — Rooms & Occupancy (`/hospitality/rooms/*`)

**Allowed roles:** `sys_admin`, `building_manager`, `financial_decision_maker`.

| KPI | Formula |
|---|---|
| Occupancy % | `(roomsOccupied / availableRooms) × 100` (OOO excluded from availability) |
| ADR | `totalRoomRevenue / roomsSold` |
| RevPAR | `totalRoomRevenue / availableRooms` (= ADR × occupancy) |
| Stay-Overs | rooms `occupied AND checkOut != today` |

**Endpoints**
- `GET /hospitality/rooms/summary` — KPI block + totals
- `GET /hospitality/rooms/breakdown?metric=occupancy|adr|revpar|stayovers` — per-floor and per-roomType
- `GET /hospitality/rooms/list` — array of rooms (id, number, floor, type, status, …)
- `GET /hospitality/rooms/:id` — room detail with folio, services, history

**Drill-down UX**
- Each KPI card on the page is a button. Clicking opens a modal that calls
  `breakdown?metric=…` and renders both `byFloor` and `byType` tables, including
  the formula that produced the value.
- Each room number on the Room Status Board is clickable and opens the room
  detail modal.

---

## Security & Validation

All endpoints above are mounted **after** the bearer-token check, so:
- An unauthenticated request returns `401 UNAUTHORIZED`.
- A request from a role not on the allowed list returns `403 FORBIDDEN`.
- `/hospitality/rooms/breakdown` validates `metric ∈ {occupancy, adr, revpar, stayovers}` and returns `400 VALIDATION_ERROR` otherwise.
- `/hospitality/rooms/:id` validates the id with regex `^[A-Za-z0-9_-]{1,16}$` and returns `404 NOT_FOUND` for unknown rooms — preventing path traversal and SSRF-style probing.
- Existing platform middleware in `demo-server.mjs` enforces CORS to `http://localhost:5001`, JSON-only response shape (`{ data, meta? } | { error }`), and short token TTL (15 min access, 7 day refresh in HttpOnly cookie).
- Frontend strictly types responses; no values are interpolated into HTML — Tailwind classes only — so XSS is prevented at the UI boundary as well.

## Versioning

Responses include `meta.rulesVersion` (currently `"1.0"`). Any rule change MUST
bump this string and be reflected here.
