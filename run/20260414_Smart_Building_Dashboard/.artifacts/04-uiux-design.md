# 04 — UI/UX Design: Strategic Smart Building Dashboard

> **Project Code**: `20260414_Smart_Building_Dashboard`  
> **Created**: 2026-04-14  
> **Author**: UI/UX Designer Agent (Stage 4)  
> **Status**: Ready for Coder Implementation  
> **Input Artifact**: `.artifacts/03-sa-system-design.md`

---

## 1. UX Strategy Summary

### Primary User Goals

| Persona | Goal | Core Task |
|---|---|---|
| **Financial Decision Maker** (Budi/Diana) | See energy cost and anomalies instantly | Glance at executive dashboard, export PDF |
| **System Administrator** (Rina) | Monitor all building systems from one screen | Configure alerts, manage assets, review floor plans |
| **Technician** (Agus) | Act on equipment issues fast, on mobile | View assigned asset health, acknowledge alerts |

### Key Usability Principles

1. **Glanceability** — KPIs visible within 2 seconds of page load. No clicks to see critical status.
2. **Role-first navigation** — Each role lands on their tailored dashboard. Sidebar shows only permitted pages.
3. **Progressive disclosure** — Summary → detail on click. Cards expand or link to full pages.
4. **Mobile-native for technicians** — Touch targets ≥ 44px, bottom nav for one-handed use.
5. **Status through color** — Green/Yellow/Red universal pattern for health and alerts.

### Core Assumptions

- Dark theme is default (control rooms, low-light environments). Light theme deferred to Phase 2 (PLAT-03).
- English-only UI for MVP.
- All timestamps display in building's local timezone (Asia/Jakarta).
- Real-time data via Socket.IO updates widgets without page reload.

---

## 2. Design System

### 2.1 Color Palette (Dark Theme)

```
Background Layers:
  bg-primary:     #0f172a  (slate-900)     — Page background
  bg-secondary:   #1e293b  (slate-800)     — Card / panel surfaces
  bg-tertiary:    #334155  (slate-700)     — Hover states, input fields
  bg-elevated:    #475569  (slate-600)     — Active/selected states

Text:
  text-primary:   #f8fafc  (slate-50)      — Headings, primary text
  text-secondary: #94a3b8  (slate-400)     — Labels, descriptions
  text-muted:     #64748b  (slate-500)     — Placeholder, disabled

Accent / Brand:
  accent:         #3b82f6  (blue-500)      — Primary buttons, links, active nav
  accent-hover:   #2563eb  (blue-600)      — Button hover
  accent-light:   #1d4ed8  (blue-700)      — Focus rings

Status Colors:
  status-ok:      #22c55e  (green-500)     — Normal / healthy / online
  status-warn:    #eab308  (yellow-500)    — Warning / degraded
  status-crit:    #ef4444  (red-500)       — Critical / alarm / offline
  status-info:    #3b82f6  (blue-500)      — Informational

Charts:
  chart-1:        #3b82f6  (blue-500)      — Primary series
  chart-2:        #22c55e  (green-500)     — Comparison / positive
  chart-3:        #eab308  (yellow-500)    — Secondary series
  chart-4:        #a855f7  (purple-500)    — Tertiary series

Borders:
  border-default: #334155  (slate-700)
  border-subtle:  #1e293b  (slate-800)
```

### 2.2 Typography

```
Font Family:    Inter (Google Fonts), fallback: system-ui, sans-serif
                Tailwind: font-sans (configure in tailwind.config.ts)

Scale:
  Display:      text-3xl  (30px)  font-bold     — Page titles
  Heading:      text-xl   (20px)  font-semibold  — Section headers, card titles
  Subheading:   text-lg   (18px)  font-medium    — Widget headers
  Body:         text-sm   (14px)  font-normal    — Default text, table cells
  Caption:      text-xs   (12px)  font-normal    — Timestamps, badges, footnotes
  Metric:       text-4xl  (36px)  font-bold      — KPI numbers in dashboard cards
  Metric-sm:    text-2xl  (24px)  font-bold      — Secondary metric numbers
```

### 2.3 Spacing & Grid

```
Base unit:      4px (Tailwind default)
Spacing scale:  p-1 (4px), p-2 (8px), p-3 (12px), p-4 (16px), p-6 (24px), p-8 (32px)

Card padding:   p-4 (16px) mobile, p-6 (24px) desktop
Card gap:       gap-4 (16px) mobile, gap-6 (24px) desktop
Section gap:    space-y-6 (24px)
Page padding:   px-4 (16px) mobile, px-6 (24px) tablet, px-8 (32px) desktop

Card radius:    rounded-xl (12px)
Button radius:  rounded-lg (8px)
Badge radius:   rounded-full
Input radius:   rounded-lg (8px)
```

### 2.4 Component Tokens

```
Card:
  bg-slate-800 border border-slate-700 rounded-xl p-4 md:p-6 shadow-lg

Button Primary:
  bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg px-4 py-2 transition-colors

Button Secondary:
  bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg px-4 py-2

Input Field:
  bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-50
  focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-500

Badge (status):
  inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
  OK:       bg-green-500/20 text-green-400
  Warning:  bg-yellow-500/20 text-yellow-400
  Critical: bg-red-500/20 text-red-400

Table:
  Header: bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider
  Row:    border-b border-slate-700 hover:bg-slate-700/50
  Cell:   px-4 py-3 text-sm text-slate-200
```

---

## 3. Layout Architecture

### 3.1 Shell Layout (AppLayout Component)

```
┌────────────────────────────────────────────────────────────────┐
│ Header (h-16, fixed top, bg-slate-900 border-b border-slate-700)│
│ ┌──────────┬──────────────────────────┬────────────────────┐   │
│ │ ☰ Logo   │  BuildingSelector ▼      │ 🔔 (3)  👤 Avatar │   │
│ └──────────┴──────────────────────────┴────────────────────┘   │
├────────┬───────────────────────────────────────────────────────┤
│Sidebar │  Main Content Area                                    │
│(w-64)  │  (flex-1, overflow-y-auto, p-6 lg:p-8)              │
│        │                                                       │
│ 📊 Dash│  ┌─────────────────────────────────────────────┐     │
│ ⚡ Energy│  │  Page content renders here                  │     │
│ 🌡 Env  │  │  (role-based routing)                       │     │
│ 🔧 Assets│  │                                             │     │
│ 🗺 Floors│  │                                             │     │
│ 🔔 Alerts│  │                                             │     │
│ 📄 Reports│  │                                             │     │
│ ⚙ Settings │                                             │     │
│        │  └─────────────────────────────────────────────┘     │
│        │                                                       │
├────────┴──────────────────────────── (mobile only) ────────────┤
│ BottomNav (h-16, fixed bottom, bg-slate-900 border-t)          │
│ ┌──────┬──────┬──────┬──────┬──────┐                          │
│ │ Home │Energy│Assets│Alerts│ More │                          │
│ └──────┴──────┴──────┴──────┴──────┘                          │
└────────────────────────────────────────────────────────────────┘
```

**Desktop (≥1024px / `lg:`)**: Sidebar permanently visible at `w-64`. Main content fills remaining width.  
**Tablet (768–1023px / `md:`)**: Sidebar collapsed to icon-only (`w-16`), hover to expand. Main content wider.  
**Mobile (<768px)**: Sidebar hidden. Hamburger menu in header opens overlay drawer. Bottom nav always visible.

### 3.2 Header Component — `<AppHeader />`

```
Structure:
  <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-700 z-40 flex items-center px-4 lg:px-6">
    <!-- Left -->
    <HamburgerButton />         <!-- mobile only: lg:hidden -->
    <Logo />                    <!-- "SmartBuild" text-lg font-bold text-blue-400 -->

    <!-- Center -->
    <BuildingSelector />        <!-- Dropdown: current building name, switch between pilot buildings -->

    <!-- Right -->
    <NotificationBell />        <!-- Relative icon with badge count (bg-red-500 rounded-full) -->
    <UserAvatar />              <!-- Initials circle + dropdown: profile, logout -->
  </header>
```

**BuildingSelector**: `<select>` styled dropdown showing building name. Changing it updates all page data via React context. Only shown if user has access to multiple buildings.

**NotificationBell**: Click opens a right-side panel (`<NotificationPanel />`) — a sliding drawer or popover listing recent notifications sorted by time. Each item shows severity icon, message, timestamp. "Mark all read" button at top.

**UserAvatar**: Circle with user initials (`bg-blue-500 text-white text-sm font-medium rounded-full w-8 h-8`). Dropdown: user name, role badge, "Settings" link, "Logout" button.

### 3.3 Sidebar Component — `<AppSidebar />`

```
Structure (desktop):
  <aside className="fixed left-0 top-16 bottom-0 w-64 bg-slate-900 border-r border-slate-700 overflow-y-auto">
    <nav className="py-4 space-y-1">
      <NavItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" />
      <NavItem icon={Zap} label="Energy" href="/energy" />
      <NavItem icon={Thermometer} label="Environment" href="/environment" />
      <NavItem icon={Wrench} label="Assets" href="/assets" />
      <NavItem icon={Map} label="Floor Plans" href="/floor-plans" />
      <NavItem icon={Bell} label="Alerts" href="/alerts" badge={activeAlertCount} />
      <NavItem icon={FileText} label="Reports" href="/reports" />
      <Separator />
      <NavItem icon={Settings} label="Settings" href="/settings" />
    </nav>
  </aside>
```

**NavItem states**:
- Default: `text-slate-400 hover:bg-slate-800 hover:text-slate-200`
- Active: `bg-blue-500/10 text-blue-400 border-r-2 border-blue-400`
- Badge (alert count): `bg-red-500 text-white text-xs rounded-full px-1.5 ml-auto`

**RBAC Filtering**: Sidebar renders only items the user's role can access:
| Nav Item | financial_decision_maker | sys_admin | technician |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Energy | ✅ | ✅ | ✅ |
| Environment | ✅ | ✅ | ✅ |
| Assets | ❌ | ✅ | ✅ |
| Floor Plans | ❌ | ✅ | ✅ |
| Alerts | ❌ | ✅ | ✅ |
| Reports | ✅ | ✅ | ❌ |
| Settings | ❌ | ✅ | ❌ |

### 3.4 Bottom Navigation — `<BottomNav />` (Mobile Only)

```
<nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-700 flex items-center justify-around lg:hidden z-40">
  <BottomNavItem icon={Home} label="Home" href="/dashboard" />
  <BottomNavItem icon={Zap} label="Energy" href="/energy" />
  <BottomNavItem icon={Wrench} label="Assets" href="/assets" />
  <BottomNavItem icon={Bell} label="Alerts" href="/alerts" badge={count} />
  <BottomNavItem icon={Menu} label="More" onClick={openDrawer} />
</nav>
```

Active state: `text-blue-400`, inactive: `text-slate-500`. Icons: 24px. Labels: `text-xs`. Touch target: `min-h-[44px] min-w-[44px]`.

"More" opens a drawer overlay with remaining nav items (Environment, Floor Plans, Reports, Settings, Logout).

---

## 4. Page Inventory & Wireframes

### 4.1 Login Page — `/login`

```
Layout: Centered card on bg-slate-900, no sidebar/header.

┌──────────────────────────────┐
│                              │
│     🏢 SmartBuild            │
│     Smart Building Dashboard │
│                              │
│  ┌────────────────────────┐  │
│  │  Email                 │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  Password         👁   │  │
│  └────────────────────────┘  │
│                              │
│  [ Remember me ]             │
│                              │
│  ┌────────────────────────┐  │
│  │     Sign In            │  │
│  └────────────────────────┘  │
│                              │
│  Rate limit: 5 attempts/15m  │
└──────────────────────────────┘

Card: max-w-md mx-auto mt-[20vh] bg-slate-800 rounded-xl p-8
Logo: text-blue-400 text-2xl font-bold mb-2
Subtitle: text-slate-400 text-sm mb-8
Inputs: full width, bg-slate-700
Button: w-full bg-blue-500 hover:bg-blue-600
Error: text-red-400 text-sm mt-2 (appears below form on failure)
```

**States**: Loading (button shows spinner), Error (red banner: "Invalid credentials"), Rate limited (disable button, show countdown).

---

### 4.2 Executive Dashboard — `/dashboard` (financial_decision_maker)

```
┌──────────────────────────────────────────────────────────────┐
│ Dashboard                                        📅 Today ▼  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│ │ TODAY COST   │ │ MTD BILLING  │ │ VARIANCE     │          │
│ │ Rp 2.15M    │ │ Rp 13.29M   │ │ +3.4% ▲      │          │
│ │ ↑ vs yesterday│ │ projected   │ │ vs last month│          │
│ └──────────────┘ └──────────────┘ └──────────────┘          │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ Energy Consumption Trend (7-day line chart)            │   │
│ │ ┌─────────────────────────────────────────────────┐    │   │
│ │ │ ___/\___/\___     ← this period (blue)          │    │   │
│ │ │ ---/----\---      ← last period (slate dashed)  │    │   │
│ │ └─────────────────────────────────────────────────┘    │   │
│ │ Mon  Tue  Wed  Thu  Fri  Sat  Sun                      │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌─────────────────────────┐ ┌────────────────────────────┐  │
│ │ Comfort Zone Overview   │ │ Anomaly Summary             │  │
│ │                         │ │                              │  │
│ │  🟢 10 Normal           │ │ ⚠ Weekend spike +35%       │  │
│ │  🟡  2 Warning          │ │ ⚠ Chiller COP declined    │  │
│ │  🔴  0 Critical         │ │ 🔴 Lobby CO2 exceeded     │  │
│ │                         │ │                              │  │
│ └─────────────────────────┘ └────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ [📄 Export Energy Report PDF]                          │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**Widget Breakdown**:

| Widget | Component Name | Data Source | Update |
|---|---|---|---|
| Today Cost card | `<KpiCard />` | `GET /dashboard/executive` → `energyCostToday` | Socket.IO `energy:summary` |
| MTD Billing card | `<KpiCard />` | `GET /dashboard/executive` → `billingProjection` | REST poll every 60s |
| Variance card | `<KpiCard />` | `GET /dashboard/executive` → `billingProjection.variancePercent` | REST poll |
| Energy Trend chart | `<EnergyTrendChart />` | `GET /energy/trends?interval=daily&compare=previous_period` | REST on load |
| Comfort Overview | `<ComfortOverview />` | `GET /dashboard/executive` → `comfortOverview` | Socket.IO `sensor:reading` aggregated |
| Anomaly Summary | `<AnomalyTable />` | `GET /dashboard/executive` → `topAnomalies` | REST poll every 60s |

**KPI Card Anatomy**:
```
<div className="bg-slate-800 border border-slate-700 rounded-xl p-4 md:p-6">
  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
  <p className="text-3xl font-bold text-slate-50">{value}</p>
  <p className="text-sm mt-1 {positive ? 'text-green-400' : 'text-red-400'}">
    {delta} vs {comparison}
  </p>
</div>
```

---

### 4.3 Energy Management — `/energy`

```
┌──────────────────────────────────────────────────────────────┐
│ Energy Management                        Period: [This Week]▼│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│ │ ⚡ CURRENT    │ │ POWER FACTOR │ │ PEAK LOAD    │          │
│ │ CONSUMPTION  │ │              │ │              │          │
│ │  248 kW      │ │  0.87        │ │  420.3 kW    │          │
│ │ [gauge arc]  │ │ [gauge arc]  │ │ [gauge arc]  │          │
│ └──────────────┘ └──────────────┘ └──────────────┘          │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ Consumption Trend                    [Hourly|Daily|Monthly]│
│ │ ┌─────────────────────────────────────────────────┐    │   │
│ │ │         Bar chart with kWh per interval          │    │   │
│ │ └─────────────────────────────────────────────────┘    │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌─────────────────────────┐ ┌────────────────────────────┐  │
│ │ Billing Projection      │ │ Tariff Configuration       │  │
│ │ Projected: Rp 13.29M   │ │ Current: Rp 1,444.70/kWh  │  │
│ │ Last month: Rp 12.85M  │ │ [Edit] (sys_admin only)    │  │
│ │ [progress bar 48% month]│ │                            │  │
│ └─────────────────────────┘ └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Energy Gauge Card** — `<EnergyGaugeCard />`:
- Semi-circular arc gauge (SVG) with animated fill
- Color thresholds: green (0–70%), yellow (70–85%), red (85–100% of capacity)
- Center displays current numeric value + unit
- Below: label text
- Tailwind container: `bg-slate-800 rounded-xl p-6 flex flex-col items-center`
- Real-time update via Socket.IO `energy:summary`

**Time Interval Tabs**: `<SegmentedControl />` — `inline-flex bg-slate-700 rounded-lg p-1`, active segment `bg-blue-500 rounded-md text-white`, inactive `text-slate-400`.

---

### 4.4 Environmental Quality — `/environment`

```
┌──────────────────────────────────────────────────────────────┐
│ Environmental Quality                    Floor: [All] ▼      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌────────────────────── Zone Cards Grid ──────────────────┐  │
│ │                                                         │  │
│ │ ┌─────────────────┐  ┌─────────────────┐               │  │
│ │ │ Lobby           │  │ Conference Rm A  │               │  │
│ │ │ 🟢 Normal       │  │ 🟡 Warning       │               │  │
│ │ │                 │  │                  │               │  │
│ │ │ 🌡 24.5°C       │  │ 🌡 27.1°C ⚠     │               │  │
│ │ │ 💧 52%          │  │ 💧 65% ⚠        │               │  │
│ │ │ 🌬 650 ppm Good │  │ 🌬 820 ppm Mod  │               │  │
│ │ │                 │  │                  │               │  │
│ │ │ [Speedometer]   │  │ [Speedometer]    │               │  │
│ │ └─────────────────┘  └─────────────────┘               │  │
│ │                                                         │  │
│ │  ... (responsive grid: 1 col mobile, 2 tablet, 3 desktop)│  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ Zone Detail (click to expand / navigate)                │   │
│ │ Temperature trend line (24h) + Humidity + CO2 overlay  │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**Environmental Speedometer** — `<EnvironmentGauge />`:
- SVG arc gauge per zone card showing composite comfort score
- Needle position: derived from worst-of (temp, humidity, CO2) relative to zone thresholds
- Arc segments: green (comfortable) → yellow (borderline) → red (out-of-range)
- Size: 120×80px inside card
- Updates via Socket.IO `sensor:reading`

**Zone Card** — `<ZoneCard />`:
```
<div className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-blue-500/50 cursor-pointer transition-colors">
  <div className="flex justify-between items-start mb-3">
    <h3 className="text-sm font-semibold text-slate-50">{zoneName}</h3>
    <StatusBadge status={zone.status} />
  </div>
  <div className="space-y-2 text-sm">
    <MetricRow icon={Thermometer} label="Temp" value="24.5°C" status="normal" />
    <MetricRow icon={Droplets} label="Humidity" value="52%" status="normal" />
    <MetricRow icon={Wind} label="CO2" value="650 ppm" aqiLabel="Good" status="normal" />
  </div>
  <EnvironmentGauge score={comfortScore} className="mt-3 mx-auto" />
</div>
```

Grid layout: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6`

---

### 4.5 Asset Health (CME) — `/assets`

```
┌──────────────────────────────────────────────────────────────┐
│ Asset Health                    Type: [All]▼  Status: [All]▼ │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─── Summary Bar ────────────────────────────────────────┐   │
│ │  🟢 20 Healthy     🟡 4 Warning      🔴 1 Critical    │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌────────────────────── Asset Cards Grid ──────────────────┐ │
│ │                                                          │ │
│ │ ┌──────────────────┐  ┌──────────────────┐              │ │
│ │ │ 🟡 Genset #1     │  │ 🟢 AHU - Lobby  │              │ │
│ │ │ Main Building    │  │ Main Building    │              │ │
│ │ │                  │  │                  │              │ │
│ │ │ Runtime: 4520h   │  │ Runtime: 12400h  │              │ │
│ │ │ Fuel: 45% ⚠     │  │ Filter: OK       │              │ │
│ │ │ Last svc: 44d    │  │ Last svc: 12d    │              │ │
│ │ │                  │  │                  │              │ │
│ │ │ [View Details →] │  │ [View Details →] │              │ │
│ │ └──────────────────┘  └──────────────────┘              │ │
│ │                                                          │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Asset Health Card** — `<AssetCard />`:
- Left border colored by health: `border-l-4 border-green-500|border-yellow-500|border-red-500`
- Header: equipment name + type icon
- Body: 2–3 key metrics (runtime, fuel, last service)
- Footer: "View Details →" link
- Card: `bg-slate-800 border border-slate-700 rounded-xl p-4`

**G/Y/R Summary Bar** — `<HealthSummaryBar />`:
```
<div className="flex items-center gap-6 bg-slate-800 rounded-xl px-6 py-4 border border-slate-700">
  <SummaryPill color="green" count={20} label="Healthy" />
  <SummaryPill color="yellow" count={4} label="Warning" />
  <SummaryPill color="red" count={1} label="Critical" />
</div>
```

**Asset Detail Page** — `/assets/:id`:
- Full metrics display: runtime counter, fuel level gauge, linked sensor readings
- Time-series chart for equipment metrics (running hours over time)
- Linked sensor list with latest readings
- Alert history for this asset
- Sys_admin: Edit button, link/unlink sensors

---

### 4.6 Spatial / Floor Plan View — `/floor-plans`

```
┌──────────────────────────────────────────────────────────────┐
│ Floor Plans            Building: [Main]▼  Floor: [Ground]▼   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │                                                        │   │
│ │              SVG Floor Plan Viewer                     │   │
│ │                                                        │   │
│ │        🌡    💧         ⚡                             │   │
│ │    (sensor pins overlaid on floor plan)                │   │
│ │                    🌬                🔧               │   │
│ │                                                        │   │
│ │        Pinch-zoom + Pan (touch on mobile)             │   │
│ │                                                        │   │
│ │    ┌─────────────────────┐  ← Sensor popover on click │   │
│ │    │ Temp Sensor - Lobby │                             │   │
│ │    │ 24.5°C  🟢 Normal  │                             │   │
│ │    │ Updated: 10:29 AM  │                             │   │
│ │    │ [View History →]   │                             │   │
│ │    └─────────────────────┘                             │   │
│ │                                                        │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌── Layer Toggle ─────────────────────────────────────────┐  │
│ │ [✓ Temperature] [✓ Humidity] [✓ CO2] [✓ Energy] [Heatmap]│  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                              │
│ [🔥 Heatmap Mode] — Toggle heatmap overlay on floor plan    │
└──────────────────────────────────────────────────────────────┘
```

**Floor Plan Viewer** — `<FloorPlanViewer />`:
- Container: `relative w-full aspect-[16/9] bg-slate-800 rounded-xl overflow-hidden`
- SVG/PNG floor plan rendered as `<img>` or inline `<svg>` with `object-contain`
- Sensor pins: `<SensorPin />` positioned absolutely using percentage-based x/y from API
- Pin icon: 20px circle with sensor type icon, colored by status (green/yellow/red)
- Click pin → `<SensorPopover />` with live reading, status badge, "View History" link
- Zoom/pan: Use `react-zoom-pan-pinch` for touch-friendly interaction
- Heatmap: Canvas overlay with gradient (green→yellow→red) interpolated from sensor positions

**Sensor Pin** — `<SensorPin />`:
```
<div
  className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
  style={{ left: `${x}%`, top: `${y}%` }}
>
  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center
                  ring-2 ring-green-500/30 animate-pulse">
    <ThermometerIcon className="w-3 h-3 text-white" />
  </div>
</div>
```

**Heatmap Overlay** — `<HeatmapOverlay />`:
- Canvas element layered over floor plan with `pointer-events-none`
- Uses 2D gaussian interpolation from sensor points
- Color gradient: `#22c55e` (low/normal) → `#eab308` (medium) → `#ef4444` (high)
- Opacity: `0.4` for readability with floor plan underneath
- Toggle button in layer panel

**Drag-and-drop sensor placement** (sys_admin only):
- Edit mode toggle button in header
- Sensor list sidebar appears on right when in edit mode
- Drag sensor from list onto floor plan → drop sets x/y percentages
- Save button → `PUT /api/v1/floor-plans/:id/sensors`

---

### 4.7 Alerts Page — `/alerts`

```
┌──────────────────────────────────────────────────────────────┐
│ Alerts                              [Configure Rules] (admin)│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Filters:                                                     │
│ [Status: Active ▼] [Severity: All ▼] [Type: All ▼] [Date ▼]│
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ 🔴 CRITICAL  High CO2 - Conference Room B              │   │
│ │    CO2: 1200 ppm (threshold: 800 ppm)                  │   │
│ │    Triggered: 10:15 AM today                           │   │
│ │    [ Acknowledge ]  [ Resolve ]                        │   │
│ ├────────────────────────────────────────────────────────┤   │
│ │ 🟡 WARNING   Genset fuel level below 50%               │   │
│ │    Fuel: 45% (threshold: 50%)                          │   │
│ │    Triggered: 9:00 AM today  |  Ack'd by: Rina        │   │
│ │    [ Resolve ]                                         │   │
│ ├────────────────────────────────────────────────────────┤   │
│ │ 🟡 WARNING   Temperature exceeded - Lobby              │   │
│ │    Temp: 31.2°C (threshold: 30.0°C)                    │   │
│ │    Triggered: 8:45 AM  |  Resolved: 9:30 AM           │   │
│ │    ✅ Resolved                                         │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ Pagination: [ < 1 2 3 ... 5 > ]                             │
└──────────────────────────────────────────────────────────────┘
```

**Alert Row** — `<AlertRow />`:
- Left border colored by severity: `border-l-4 border-red-500|border-yellow-500|border-blue-500`
- Status-based styling: active rows have subtle pulse animation on severity icon
- Actions: Acknowledge / Resolve buttons — contextual based on current status
- On mobile: cards stack with full-width, swipe right to acknowledge (optional gesture)

**Alert Rule Configuration** (sys_admin) — `/alerts/rules`:
- Table listing all rules with enable/disable toggle switch
- "Add Rule" opens modal form:
  - Name, Sensor Type dropdown, Specific sensor (optional), Operator, Threshold, Severity, Cooldown, Email toggle
  - Form layout: `grid grid-cols-1 md:grid-cols-2 gap-4`

---

### 4.8 Automation (IFTTT) — `/automation` (Phase 2, design provided for Coder awareness)

```
┌──────────────────────────────────────────────────────────────┐
│ Automation Rules                              [+ New Rule]   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────── Rule Builder Modal ──────────────────┐ │
│ │                                                          │ │
│ │  IF   [ Sensor Type ▼ ] [ Operator ▼ ] [ Value    ]     │ │
│ │  AND  [ Time Range  ▼ ] (optional)                      │ │
│ │                                                          │ │
│ │  THEN [ Action ▼ ]                                      │ │
│ │       • Send notification                                │ │
│ │       • Send email to [___________]                     │ │
│ │       • Change setpoint (Phase 2)                       │ │
│ │       • Execute command (Phase 2)                       │ │
│ │                                                          │ │
│ │  Schedule: [ Always ▼ ] or [ Weekdays 08:00-18:00 ]    │ │
│ │                                                          │ │
│ │  [ Cancel ]                    [ Save Rule ]             │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Rule List:                                                   │
│ ┌───────────┬────────────┬──────────┬────────┬──────────┐   │
│ │ Name      │ Condition  │ Action   │ Status │          │   │
│ │ High Temp │ temp > 30  │ Notify   │ 🟢 On  │ [Edit]   │   │
│ │ Off Hours │ energy>base│ Email    │ 🔴 Off │ [Edit]   │   │
│ └───────────┴────────────┴──────────┴────────┴──────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**IFTTT Rule Builder** — `<RuleBuilder />`:
- Step-by-step form: IF condition → THEN action → Schedule
- Drag-to-reorder conditions (for multi-condition rules in Phase 2)
- Visual sentence: "IF temperature > 30°C THEN send notification"
- MVP only supports alert-as-action (notification/email). Device control deferred.

---

### 4.9 Reports — `/reports`

```
┌──────────────────────────────────────────────────────────────┐
│ Reports                                                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Generate Report:                                             │
│ ┌──────────────────────────────────────────────────────┐     │
│ │ Type: [Energy Summary ▼]  [Alert History ▼]          │     │
│ │ Period: [2026-04-01] to [2026-04-14]                 │     │
│ │ Building: [Main Building ▼]                          │     │
│ │ [ Generate PDF ]                                     │     │
│ └──────────────────────────────────────────────────────┘     │
│                                                              │
│ Recent Reports:                                              │
│ ┌──────────┬────────────┬────────┬─────────────────────┐    │
│ │ Type     │ Period     │ Status │                     │    │
│ │ Energy   │ Apr 1-14   │ ✅ Ready│ [📥 Download PDF]  │    │
│ │ Alerts   │ Mar 2026   │ ✅ Ready│ [📥 Download PDF]  │    │
│ │ Energy   │ Mar 2026   │ ⏳ Gen  │ Generating...       │    │
│ └──────────┴────────────┴────────┴─────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

---

### 4.10 Settings — `/settings` (sys_admin only)

```
Tabs: [Users] [Buildings] [Tariffs] [System]

Users Tab:
  - User table: name, email, role, status, last login
  - [+ Add User] button → modal form
  - Inline activate/deactivate toggle

Buildings Tab:
  - Building details form (name, address, timezone)
  - Floor/zone management (tree view: building > floor > zone)

Tariffs Tab:
  - Current IDR/kWh rate display + edit form

System Tab:
  - Health status of services (DB, MQTT, Redis)
  - MQTT broker connection status
  - Last data ingestion timestamp
```

---

### 4.11 Operations Dashboard — `/dashboard` (sys_admin)

```
┌──────────────────────────────────────────────────────────────┐
│ Operations Dashboard                                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐    │
│ │ SENSORS   │ │ ALERTS    │ │ EQUIPMENT │ │ SYSTEM    │    │
│ │ 115/120   │ │ 🔴1 🟡5   │ │ 🟢20 🟡4   │ │ All OK 🟢 │    │
│ │ online    │ │ 18 active │ │ 🔴1       │ │           │    │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘    │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ Recent Events (live feed, scrolling)                   │   │
│ │ 10:15  🟡 High CO2 in Conference Room B               │   │
│ │ 10:12  🟢 Pump #3 vibration returned to normal        │   │
│ │ 09:45  🔴 Genset fuel critically low                  │   │
│ │ 09:30  ℹ️  Scheduled maintenance: AHU-02              │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌─────────────────────────┐ ┌────────────────────────────┐  │
│ │ Sensor Status Donut     │ │ Alert Distribution Bar     │  │
│ │ (online/stale/offline)  │ │ (crit/warn/info stacked)  │  │
│ └─────────────────────────┘ └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

### 4.12 Technician Dashboard — `/dashboard` (technician)

```
┌──────────────────────────────────────────────────────────────┐
│ My Dashboard                                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Pending Alerts (swipeable cards on mobile):                  │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ 🟡 Genset fuel level below 50%                         │   │
│ │ Action: Check genset fuel level                        │   │
│ │ Location: Basement - Generator Room                    │   │
│ │ 9:00 AM today                                          │   │
│ │ [ Acknowledge ]  [ View Asset → ]                      │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ My Assets:                                                   │
│ ┌──────────────────┐  ┌──────────────────┐                  │
│ │ 🟡 Genset #1     │  │ 🟢 Pump #2       │                  │
│ │ Fuel: 45%        │  │ Runtime: 8200h   │                  │
│ │ Basement         │  │ B1 - Pump Room   │                  │
│ └──────────────────┘  └──────────────────┘                  │
│                                                              │
│ Recent Activity:                                             │
│ • 8:30 AM — Acknowledged: Pump vibration elevated           │
│ • Yesterday — Resolved: AHU filter replacement              │
└──────────────────────────────────────────────────────────────┘
```

---

### 4.13 Occupancy View — `/environment/occupancy` (Phase 2 placeholder)

- Occupancy sensor readings per zone displayed as bar/percentage
- Floor plan heatmap overlay showing occupancy density
- Skeleton page with "Coming in Phase 2" message for MVP

---

## 5. Key Widget Specifications

### 5.1 Widget Component Registry

| Component | Used On | Props | Library |
|---|---|---|---|
| `<KpiCard />` | Executive, Operations | label, value, delta, trend, icon | Custom |
| `<EnergyGaugeCard />` | Energy | value, max, unit, thresholds, label | Custom SVG |
| `<EnvironmentGauge />` | Environment | score (0-100), size | Custom SVG |
| `<ZoneCard />` | Environment | zone object with readings | Custom |
| `<AssetCard />` | Assets | equipment object | Custom |
| `<FloorPlanViewer />` | Floor Plans | floorPlanUrl, sensorPlacements, mode | react-zoom-pan-pinch |
| `<SensorPin />` | Floor Plans | x, y, type, status, reading | Custom |
| `<SensorPopover />` | Floor Plans | sensor data, onClose | Custom |
| `<HeatmapOverlay />` | Floor Plans | sensorPoints, metric, bounds | Canvas |
| `<AlertRow />` | Alerts | alert object, onAck, onResolve | Custom |
| `<AlertPanel />` | Sidebar/Notifications | alerts[], onAck | Custom |
| `<RuleBuilder />` | Automation | rule object, onSave | Custom (Phase 2) |
| `<AnomalyTable />` | Executive Dashboard | anomalies[] | Custom |
| `<SegmentedControl />` | Energy, Reports | options[], selected, onChange | Custom |
| `<StatusBadge />` | All pages | status, size | Custom |
| `<DataTable />` | Alerts, Assets, Users | columns, data, pagination | Custom |
| `<EnergyTrendChart />` | Executive, Energy | series, interval, comparison | Recharts |
| `<DonutChart />` | Operations | data, colors | Recharts |
| `<LineChart />` | Zone Detail, Asset Detail | series, timerange | Recharts |
| `<BarChart />` | Energy Trends | data, interval | Recharts |
| `<NotificationPanel />` | Header (global) | notifications[], onMarkRead | Custom |

### 5.2 Chart Library

**Recommended: Recharts** (built on React + D3, good Tailwind compat, SSR safe)

Chart styling tokens:
```
Background:    transparent (charts sit on bg-slate-800 cards)
Grid lines:    stroke="#334155" (slate-700)
Axis labels:   fill="#94a3b8" (slate-400), fontSize=12
Tooltip:       bg-slate-700, border-slate-600, rounded-lg, shadow-xl
Legend:         text-slate-400, text-xs
```

---

## 6. Responsive Design Specs

### 6.1 Breakpoints (Tailwind Defaults)

| Breakpoint | Width | Layout |
|---|---|---|
| Default (mobile) | < 768px | Single column, bottom nav, stacked cards, hamburger menu |
| `md` (tablet) | 768–1023px | 2-column grid, icon sidebar, expandable on hover |
| `lg` (desktop) | 1024–1279px | Full sidebar, 2–3 column grid, full tables |
| `xl` (wide) | ≥ 1280px | Full sidebar, 3–4 column grid, spacious layout |

### 6.2 Mobile Adaptations

| Element | Desktop | Mobile |
|---|---|---|
| Sidebar | Fixed left `w-64` | Hidden, hamburger opens drawer overlay |
| Bottom nav | Hidden | Fixed bottom `h-16`, 5 items |
| KPI cards | 3-column row | Full-width stack |
| Zone cards | 3-column grid | Full-width stack, swipe horizontal carousel optional |
| Data tables | Full table with columns | Card list view (each row → card) |
| Floor plan | Large viewport with mouse zoom | Full width, pinch-zoom, tap for popover |
| Charts | Large with hover tooltips | Full width, tap for tooltips |
| Modals | Centered overlay `max-w-lg` | Full-screen bottom sheet |
| Filters | Inline horizontal | Collapsible filter drawer |
| Alert actions | Inline buttons | Full-width action buttons below card |

### 6.3 Touch Targets

- All interactive elements: `min-h-[44px] min-w-[44px]` (WCAG 2.5.5)
- Button padding: `px-4 py-3` on mobile (larger than desktop `py-2`)
- Sensor pins on floor plan: `w-8 h-8` on mobile (larger than desktop `w-6 h-6`)
- Spacing between adjacent tap targets: `gap-2` minimum

### 6.4 Mobile-Specific Patterns

- **Swipeable tabs**: Energy page time intervals, Alert severity tabs — use horizontal scroll with `overflow-x-auto snap-x snap-mandatory`
- **Pull-to-refresh**: Main dashboard and alert list — `overscroll-behavior-y: contain` with custom refresh indicator
- **Sticky header on scroll**: KPI summary bar sticks to top as user scrolls content
- **Bottom sheet modals**: Forms and detail views open as bottom sheets instead of centered modals

---

## 7. Accessibility & Usability

### 7.1 WCAG 2.1 AA Compliance

| Check | Implementation |
|---|---|
| Color contrast | All text meets 4.5:1 ratio. Slate-50 on Slate-800 = 11.7:1 ✅ |
| Status not color-only | All status indicators include icon + text label alongside color |
| Focus indicators | `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900` |
| Keyboard navigation | All interactive elements tabbable. Modals trap focus. Esc closes overlays |
| Screen reader | ARIA labels on icon-only buttons, `role="status"` on live-updating KPI cards, `aria-live="polite"` on alert notifications |
| Reduced motion | `motion-reduce:transition-none motion-reduce:animate-none` on all animations |
| Skip navigation | "Skip to main content" link at top of page |

### 7.2 Content & Microcopy

- Use sentence case for all labels and headings
- Error messages: descriptive and actionable ("Email format is invalid" not "Error 422")
- Empty states: illustration + message + CTA ("No alerts found. Your building is running smoothly." or "No equipment added yet. [Add equipment →]")
- Loading states: skeleton cards matching final card dimensions (`animate-pulse bg-slate-700 rounded`)
- Timestamps: "10:15 AM today", "Yesterday 3:30 PM", "Apr 10, 2026" (relative when < 24h)

---

## 8. Navigation & Information Architecture

### 8.1 Page Routing Structure

```
/login                          — Login page (public)
/dashboard                      — Role-based dashboard (auto-redirects by role)
/energy                         — Energy management
/environment                    — Environmental quality (zone grid)
/environment/:zoneId            — Zone detail with sensor charts
/assets                         — Asset health list
/assets/:id                     — Asset detail with metrics
/floor-plans                    — Floor plan viewer
/alerts                         — Alert list
/alerts/rules                   — Alert rule configuration (sys_admin)
/automation                     — IFTTT rules (Phase 2)
/reports                        — Report generation & download
/settings                       — System settings (sys_admin)
/settings/users                 — User management
/settings/buildings             — Building/floor/zone config
```

### 8.2 Role-Based Redirects

| After login, redirect to: |
|---|
| `financial_decision_maker` → `/dashboard` (executive view) |
| `sys_admin` → `/dashboard` (operations view) |
| `technician` → `/dashboard` (technician view) |

The `/dashboard` route renders different components based on `user.role` from JWT context.

---

## 9. Handoff

### Inputs Consumed
- `.artifacts/03-sa-system-design.md` — System architecture, API contracts, RBAC matrix, Socket.IO events, database schema

### Outputs Produced
- `.artifacts/04-uiux-design.md` — This document

### Component List for Coder

**Layout Components (build first)**:
1. `<AppLayout />` — Shell with sidebar, header, main content area
2. `<AppHeader />` — Fixed top header with logo, building selector, notification bell, avatar
3. `<AppSidebar />` — Left sidebar nav with role-based filtering
4. `<BottomNav />` — Mobile bottom navigation
5. `<NotificationPanel />` — Slide-out notification drawer

**Shared Components**:
6. `<KpiCard />` — Metric card with label, value, delta
7. `<StatusBadge />` — Green/Yellow/Red status pill
8. `<SegmentedControl />` — Tab-like toggle for filters
9. `<DataTable />` — Sortable, paginated table with mobile card fallback
10. `<EmptyState />` — Illustration + message + CTA for empty data
11. `<SkeletonCard />` — Loading placeholder

**Chart Components (Recharts wrappers)**:
12. `<EnergyTrendChart />` — Line/bar chart for energy data
13. `<DonutChart />` — For status distribution
14. `<LineChart />` — Generic time-series line chart

**Feature Components**:
15. `<EnergyGaugeCard />` — SVG arc gauge for energy metrics
16. `<EnvironmentGauge />` — SVG comfort score gauge
17. `<ZoneCard />` — Environmental zone status card
18. `<AssetCard />` — Equipment health card with G/Y/R border
19. `<HealthSummaryBar />` — G/Y/R pill counts
20. `<FloorPlanViewer />` — Zoomable floor plan container
21. `<SensorPin />` — Positioned sensor dot on floor plan
22. `<SensorPopover />` — Click-to-inspect sensor detail popup
23. `<HeatmapOverlay />` — Canvas gradient overlay
24. `<AlertRow />` — Alert list item with actions
25. `<AnomalyTable />` — Executive anomaly summary
26. `<RuleBuilder />` — IFTTT-style rule form (Phase 2 prep)

### Decisions Needed from PM
1. Confirm dark-theme-only for MVP (no light theme toggle until Phase 2).
2. Confirm "More" drawer on mobile bottom nav vs. full hamburger-only approach.
3. Occupancy page — show skeleton page or hide from nav entirely in MVP?

### Open UX Risks
1. **Floor plan performance on mobile**: Large SVGs with 50+ sensor pins may lag on older devices. Recommend lazy-loading pins by viewport.
2. **Real-time data visual noise**: 500 sensors emitting at 1/sec may cause excessive UI updates. Socket.IO throttling (1/s per sensor) is essential; frontend should batch React state updates.
3. **IDR currency formatting**: Large numbers (Rp 13.291.240) need proper Indonesian locale formatting with dot separators.

### Go/No-Go

**✅ GO** — Recommend Coder proceed with frontend implementation.

The design covers all MVP pages, provides concrete component specifications with Tailwind class hints, defines responsive behavior for all breakpoints, and aligns with the API contract from the system design. The component hierarchy is implementation-ready for Next.js 14 App Router with TypeScript and Tailwind CSS.
