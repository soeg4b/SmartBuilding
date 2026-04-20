# 01 — Creator Vision: Strategic Smart Building Dashboard

> **Project Code**: `20260414_Smart_Building_Dashboard`
> **Created**: 2026-04-14
> **Author**: Creator Agent (Stage 1)
> **Status**: Draft for Product Manager Review

---

## 1. Product Vision & Mission

### Problem Statement

Commercial buildings and smart hotels today operate in fragmented silos. Energy management, HVAC control, asset maintenance, occupancy analytics, and financial reporting each live in separate vendor dashboards with no unified view. This fragmentation creates critical pain points:

- **Financial Decision Makers** cannot correlate energy spend with occupancy patterns or ESG compliance targets. They rely on monthly spreadsheets and lack real-time cost visibility in local currency (IDR/Rupiah), making budget variance detection slow and reactive.
- **System Administrators** juggle 5–10 separate systems (BACnet controllers, MQTT dashboards, SCADA screens, CCTV platforms) with no unified automation or alerting layer. Cross-system correlations (e.g., "HVAC fault + rising indoor temperature + high occupancy") require manual analysis.
- **Technicians** receive work orders via phone calls or paper forms, have no predictive visibility into asset degradation, and cannot remotely diagnose or command field devices from a mobile interface during rounds.

The result: **20–40% wasted energy**, **unplanned equipment downtime costing 3–5× planned maintenance**, and **ESG/green building compliance gaps** that jeopardize certifications like LEED and Greenship — which are increasingly required for Class A commercial real estate in Southeast Asia.

### Vision Statement

**"One pane of glass to see, understand, and command every system in a smart building — from boardroom strategy to boiler room operations."**

The Strategic Smart Building Dashboard will be the first integrated platform that collapses the distance between IoT sensor data and boardroom decision-making. It transforms raw telemetry into actionable business intelligence, surfaces predictive maintenance alerts before failures occur, and enables remote digital-twin-based command and control — all through a single responsive web application accessible on desktop and mobile.

### Value Proposition

| Stakeholder | Current Pain | Dashboard Value |
|---|---|---|
| Owner / CFO | No real-time cost visibility; ESG reporting is manual | Live billing projection in IDR, automated ESG scoring, ROI tracking on automation investments |
| General Manager | Cannot correlate operations with guest satisfaction or revenue | Comfort Score Index, occupancy analytics, executive summary with anomaly highlights and business recommendations |
| System Administrator | Multiple siloed systems, manual cross-system troubleshooting | Unified monitoring, no-code automation engine, bidirectional device control via digital twin |
| Technician | Reactive maintenance, paper-based work orders, no mobile access | Predictive asset health alerts, mobile-first interface, tap-to-command from floor plan |

### Strategic Goals

1. **Consolidate** — Replace 5–10 separate vendor dashboards with one unified platform.
2. **Predict** — Shift from reactive to predictive operations using AI-driven asset health scoring and anomaly detection.
3. **Optimize** — Deliver measurable 20–30% energy efficiency improvement within the first year of deployment.
4. **Comply** — Automate ESG and green building certification tracking (LEED, Greenship, ISO 50001).
5. **Empower** — Give every role — from CFO to field technician — a tailored, actionable view with zero training overhead.
6. **Scale** — Build a platform that can expand from a single building to a multi-property portfolio ("Campus Mode").

---

## 2. Business Requirements

### Core Business Objectives

| # | Objective | Measurable Outcome |
|---|---|---|
| BO-1 | Reduce energy waste through real-time monitoring and automated optimization | 20–30% reduction in kWh consumption within 12 months |
| BO-2 | Extend asset lifespan and reduce unplanned downtime | 40% reduction in unplanned maintenance events; 15% increase in mean time between failures (MTBF) |
| BO-3 | Accelerate ESG compliance and green building certification readiness | Automated LEED/Greenship score calculation, audit-ready reports generated in < 1 minute |
| BO-4 | Improve occupant/guest comfort and satisfaction | Comfort Score Index ≥ 85/100 consistently across monitored zones |
| BO-5 | Provide real-time financial visibility for building operations | Live Opex vs. Budget variance displayed within 5-minute data freshness |
| BO-6 | Enable remote operations and reduce on-site response time | 50% reduction in mean time to respond (MTTR) for critical alerts |

### User / Customer Requirements

**Financial Decision Makers (Owner, GM, CFO):**
- Executive dashboard with ESG scores, carbon footprint trends, and green building certification progress
- Real-time billing projection and cost-benefit analysis in IDR (Indonesian Rupiah)
- ROI tracker showing savings from automation investments vs. baseline
- What-If simulation for strategic scenarios (e.g., temperature policy changes, capacity planning)
- Summary table highlighting anomalies per department with AI-generated business recommendations
- Monthly/quarterly PDF report export for board presentations

**System Administrators:**
- Unified monitoring of all CME systems (Civil, Mechanical, Electrical)
- Real-time IoT sensor data: temperature, humidity, CO2, occupancy, water leak
- Digital Twin spatial view with BIM/CAD/SVG floor plan upload and interactive sensor overlay
- No-code IFTTT automation engine for cross-system rules
- Bidirectional device control via BACnet, Modbus, MQTT protocols
- Alert management with escalation rules and notification channels (SMS, email, push)
- Audit logs for all commands and configuration changes

**Technicians:**
- Mobile-responsive interface optimized for tablet and smartphone
- Asset Health Index with color-coded status (Green/Yellow/Red)
- Predictive maintenance alerts with recommended actions
- Tap-to-command from floor plan (click device on map to inspect or control)
- Equipment runtime tracking (genset hours, pump cycles, filter life)
- Spare parts inventory visibility and low-stock alerts

### Success Metrics (Business-Facing)

| Metric | Target | Measurement Method |
|---|---|---|
| Energy cost reduction | 20–30% vs. pre-deployment baseline | Monthly kWh comparison, IDR savings |
| Unplanned downtime reduction | 40% decrease | Incident log analysis |
| ESG report generation time | < 1 minute (from > 2 weeks manual) | Time-to-report benchmark |
| Mean Time to Respond (MTTR) | 50% reduction | Alert-to-action timestamp delta |
| User adoption rate | > 80% of target users active weekly | Login analytics |
| Guest/Tenant Comfort Score | ≥ 85/100 | Composite sensor + survey index |
| System uptime (dashboard) | 99.5% availability | Monitoring / health checks |

### Key Constraints & Assumptions

**Constraints:**
- C-1: Building infrastructure varies widely — the system must support brownfield integration (existing BACnet/Modbus devices) without requiring hardware replacement.
- C-2: Indonesian market context — all financial figures must support IDR currency. Regulations around data sovereignty may require on-premises or local cloud deployment options.
- C-3: Mobile web is the primary mobile channel (no native app in MVP) to minimize distribution friction.
- C-4: Budget for MVP is expected to be constrained; phased delivery is essential.
- C-5: Time-series sensor data volumes can be massive (thousands of data points per minute per building); storage and query architecture must be cost-efficient.

**Assumptions:**
- A-1: Target buildings have existing BMS infrastructure with BACnet/Modbus/MQTT-capable controllers.
- A-2: Stable internet connectivity is available at deployment sites (or local network for on-prem).
- A-3: Building operators are willing to provide BIM/CAD floor plans for digital twin setup.
- A-4: Initial deployment targets 1–3 pilot buildings before scaling to portfolio.
- A-5: There is organizational buy-in for data-driven operations and willingness to act on AI recommendations.

---

## 3. Market Analysis

### Target Segments & Market Context

**Primary Segments:**

| Segment | Profile | Estimated TAM (Indonesia) |
|---|---|---|
| **Smart Hotels (4–5 star)** | 200+ rooms, existing BMS, ESG pressure from global brands | ~500 properties |
| **Class A Commercial Office Buildings** | >10,000 sqm, green building certification requirements | ~1,200 properties (Jakarta, Surabaya, Bali) |
| **Mixed-Use Developments** | Mall + office + hotel complexes, multiple stakeholder groups | ~300 developments |
| **Hospital & Healthcare Facilities** | Critical system monitoring, strict environmental controls | ~400 facilities |

**Market Drivers:**
1. **Indonesia's Green Building Regulation** — Peraturan Gubernur DKI Jakarta No. 38/2012 mandates green building standards for large commercial buildings. National regulation is expanding.
2. **Rising Energy Costs** — PLN tariff increases make energy optimization directly impactful to bottom line.
3. **ESG Investment Pressure** — International hotel chains (Marriott, Accor, IHG) increasingly require ESG compliance from managed properties.
4. **IoT Infrastructure Maturity** — BACnet and MQTT adoption is now mainstream in new Indonesian commercial construction.
5. **Post-COVID Operational Efficiency** — Reduced staffing levels demand more automation and remote monitoring capability.

**SAM (Serviceable Addressable Market):** ~600 buildings in Indonesia ready for smart building dashboard adoption (have existing BMS, budget authority, and operational need). At an estimated ARR of $15,000–$50,000 per building, the SAM is **$9M–$30M annually** for Indonesia alone.

**SOM (Serviceable Obtainable Market — Year 1–2):** 10–30 buildings, representing **$150K–$1.5M ARR**.

### Competitor Landscape

| Competitor | Strengths | Weaknesses | Positioning |
|---|---|---|---|
| **Siemens Navigator / Desigo CC** | Enterprise-grade, deep BACnet integration, global support | Expensive ($100K+), complex deployment, rigid customization, poor mobile UX | Premium enterprise |
| **Honeywell Forge** | AI analytics, cloud-native, strong hardware ecosystem | Vendor lock-in to Honeywell hardware, limited customization, high cost | Vertically integrated |
| **Johnson Controls OpenBlue** | Strong HVAC integration, digital twin capability | Primarily for new construction, expensive, heavy implementation | New-build focused |
| **Schneider Electric EcoStruxure** | Energy management depth, good dashboard UX | Narrow focus on electrical systems, limited cross-domain integration | Energy-centric |
| **Facilio (SaaS)** | Modern SaaS model, multi-site, good UX | Limited Southeast Asia presence, no Greenship support, no IDR financial views | Global SaaS |
| **Local System Integrators** | Local knowledge, lower cost | Custom-built, not scalable, no AI/predictive capability, poor UX | Project-based |

### Differentiation Opportunities

1. **"Boardroom-to-Boiler-Room" Vertical Integration** — No competitor offers a single platform that serves CFO financial views AND technician mobile maintenance in one product. This is our primary differentiator.
2. **Indonesian Market Localization** — IDR financial projections, Greenship certification tracking, PLN tariff integration, Bahasa Indonesia UI option. No global competitor does this.
3. **Digital Twin Democratization** — Upload any BIM/CAD/SVG file; no proprietary hardware or expensive 3D modeling required. Drag-and-drop sensor mapping makes setup accessible to System Administrators, not just consultants.
4. **AI What-If Simulation** — Unique scenario planning capability ("raise AC by 1°C → annual savings projection") that transforms the dashboard from a monitoring tool into a strategic planning tool.
5. **No-Code Automation** — IFTTT-style rule builder accessible to non-programmers, enabling building operators to create cross-system automations without vendor dependency.
6. **Cost Position** — SaaS pricing at 30–50% of enterprise incumbents, with faster time-to-value (weeks, not months).

### Go-to-Market Considerations (Strategic Level)

- **Beachhead Market**: 4–5 star hotels in Bali and Jakarta with international brand affiliation (ESG compliance requirements create urgency).
- **Sales Motion**: Direct sales to building owners/property management companies, supported by ROI calculator and pilot program.
- **Partnership Channel**: System integrators (SIs) who install BMS systems — offer white-label or reseller partnerships.
- **Proof of Value**: Free 30-day pilot on 1 building floor to demonstrate energy savings and operational efficiency gains.
- **Expansion Wedge**: Land with energy monitoring (lowest integration barrier), expand to full CME monitoring + automation + ESG.

---

## 4. Risk Analysis

### Strategic Risks

| Risk ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| SR-1 | **Scope creep** — the breadth of features (10 major modules) leads to an unfocused MVP that ships late | High | High | Strict MoSCoW prioritization. MVP limited to 4 core modules. Remaining features in Phase 2–3. |
| SR-2 | **Integration complexity** — each building has unique BMS configurations, protocols, and device inventories | High | High | Abstract integration via protocol adapters (BACnet/Modbus/MQTT). Start with MQTT-only in MVP. |
| SR-3 | **AI/ML overcommitment** — predictive maintenance and What-If simulation require significant data and model development | Medium | High | MVP uses rule-based thresholds and simple regression. True ML models deferred to Phase 2 with sufficient training data. |

### Market & Competitive Risks

| Risk ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| MR-1 | **Enterprise incumbents** (Siemens, Honeywell) lower pricing or improve UX for mid-market | Medium | Medium | Differentiate on localization, speed of deployment, and cost. They cannot easily serve the IDR/Greenship niche. |
| MR-2 | **Slow adoption** — building operators resist change from familiar (if fragmented) tools | Medium | High | Pilot program with guaranteed ROI metrics. Focus on "quick wins" (energy savings visible in week 1). |
| MR-3 | **Regulatory uncertainty** — data sovereignty or IoT regulations change in Indonesia | Low | Medium | Design for flexible deployment (cloud + on-prem hybrid). Keep architecture portable. |

### Feasibility & Adoption Risks

| Risk ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| FR-1 | **BIM/CAD file quality** — customer-provided floor plans may be incomplete, outdated, or in unsupported formats | High | Medium | Support multiple formats (IFC, DWG, SVG, PNG). Provide a manual floor plan drawing tool as fallback. |
| FR-2 | **Real-time data reliability** — sensor hardware may produce intermittent, noisy, or missing data | High | Medium | Implement data quality scoring, gap-filling interpolation, and stale-data indicators in the UI. |
| FR-3 | **Technician adoption** — field technicians may lack smartphones or be resistant to digital tools | Medium | Medium | Design for low-end Android devices, offline-capable views, minimal training overhead. |
| FR-4 | **Time-series data cost** — storing high-frequency sensor data at scale may be expensive | Medium | Medium | Implement tiered retention (raw: 7 days, 1-min avg: 90 days, hourly: 2 years). Use TimescaleDB compression. |

---

## 5. Target Users & Personas

### Persona 1: Budi Santoso — CFO / Financial Decision Maker

- **Role**: Chief Financial Officer at a 5-star hotel group managing 3 properties
- **Age**: 48 | **Tech Savvy**: Medium | **Device**: Laptop, iPad
- **Goals**: Reduce Opex by 15%, achieve Greenship Gold certification for investor reporting, justify automation CAPEX to board
- **Frustrations**: Gets energy reports 3 weeks late in Excel, cannot correlate energy spend with occupancy, ESG compliance is a manual nightmare consuming 2 FTEs for 4 weeks each quarter
- **Decision Criteria**: ROI proof, time-to-value, integration with existing accounting systems
- **Key Dashboard Needs**: Executive ESG view, financial cost-benefit analysis in IDR, What-If simulation, anomaly summary table

### Persona 2: Rina Wijaya — Building System Administrator

- **Role**: Head of Engineering / BMS Administrator at a Class A office tower
- **Age**: 35 | **Tech Savvy**: High | **Device**: Desktop (control room), Laptop
- **Goals**: Unify monitoring across 6 separate vendor systems, reduce alert fatigue, enable cross-system automation
- **Frustrations**: Switches between Siemens Desigo, Honeywell Niagara, and 4 other dashboards daily. Cannot create automated rules across vendors. Gets 200+ alerts/day with no prioritization.
- **Decision Criteria**: Protocol support (BACnet, Modbus, MQTT), automation flexibility, alert intelligence, audit trail
- **Key Dashboard Needs**: Unified CME monitoring, digital twin floor plan, no-code automation builder, alert management, audit logs

### Persona 3: Agus Pratama — HVAC/Electrical Technician

- **Role**: Senior Technician responsible for HVAC and electrical systems at a mixed-use development
- **Age**: 29 | **Tech Savvy**: Medium-Low | **Device**: Android smartphone (mid-range)
- **Goals**: Know which equipment needs attention before it fails, complete rounds faster, reduce emergency call-outs at night
- **Frustrations**: Gets called at 2 AM for failures that could have been predicted. No mobile access to equipment status. Paper-based work orders get lost.
- **Decision Criteria**: Mobile usability, simplicity, clear visual indicators, minimal training
- **Key Dashboard Needs**: Asset health with G/Y/R indicators, predictive alerts, mobile floor plan with tap-to-inspect, equipment runtime counters

### Persona 4: Diana Lestari — General Manager / Hotel Owner

- **Role**: Owner-operator of a boutique smart hotel (120 rooms)
- **Age**: 52 | **Tech Savvy**: Low | **Device**: iPad, iPhone
- **Goals**: Maximize guest satisfaction, optimize energy costs, achieve marketing-worthy sustainability credentials
- **Frustrations**: Cannot see the connection between building operations and guest reviews. Gets surprised by utility bills. Sustainability claims are unverifiable.
- **Decision Criteria**: Simplicity, visual appeal, business impact clarity, minimal IT overhead
- **Key Dashboard Needs**: Guest Comfort Score, occupancy analytics, ESG headline metrics, one-page executive summary

---

## 6. Product Scope Direction (MVP → Scaling)

### MVP Scope Boundaries (Phase 1 — Months 1–4)

**In Scope for MVP:**

| Module | MVP Feature Set | Rationale |
|---|---|---|
| **Core Platform** | Authentication (JWT + RBAC for 3 roles), responsive web app (desktop + mobile), dark/light theme | Foundation for all modules |
| **Energy Monitoring** | Real-time kWh, power factor, peak load tracking, daily/weekly/monthly trends, basic cost projection in IDR | Highest immediate ROI; easiest to integrate (electrical meters are most standardized) |
| **Environmental Monitoring** | Temperature, humidity, CO2 display per zone with threshold alerts | Quick win for comfort visibility; sensor integration is straightforward via MQTT |
| **Asset Health (CME)** | Equipment inventory, runtime counters, manual health scoring (G/Y/R), threshold-based alerts | Core value for technicians; does not require AI in V1 |
| **Basic Spatial View** | SVG/PNG floor plan upload, manual sensor placement (drag-and-drop), click-to-inspect | Differentiating feature; SVG approach is feasible without 3D complexity |
| **Alert & Notification** | Configurable thresholds, email + in-app notifications, alert history | Essential for operational value |
| **Dashboard & Reporting** | Role-specific home dashboards, basic PDF export | Minimum viable for all personas |

**Explicitly Out of Scope for MVP:**
- 3D Digital Twin / Three.js rendering (deferred to Phase 2)
- BACnet/Modbus bidirectional control (deferred to Phase 2; MVP is read-only monitoring)
- No-code automation engine (Phase 2)
- AI predictive maintenance models (Phase 2)
- What-If simulation engine (Phase 3)
- ESG/Greenship automated scoring (Phase 2)
- Tenant/Guest Experience Index (Phase 2)
- Spare parts inventory management (Phase 2)
- Multi-building portfolio view (Phase 3)
- Native mobile app (not planned; mobile web is the strategy)

### Post-MVP Expansion Priorities (Phase 2 — Months 5–8)

| Module | Phase 2 Feature Set |
|---|---|
| **Bidirectional Control** | BACnet/Modbus write commands via gateway, command audit trail, confirmation workflows |
| **No-Code Automation** | IFTTT rule builder: "IF temperature > 28°C AND occupancy > 80% THEN set chiller to mode X" |
| **Digital Twin 3D** | Three.js integration, BIM/IFC file import, 3D heatmap overlay, command-from-3D-view |
| **ESG & Greenship** | Automated LEED/Greenship score calculation, carbon footprint tracker, water intensity metrics |
| **Predictive Maintenance (AI v1)** | Anomaly detection using statistical models (z-score, moving average), failure probability scoring |
| **Guest/Tenant Comfort** | Comfort Score composite index, space utilization analytics, satisfaction correlation |
| **Advanced Reporting** | Scheduled report delivery, Opex vs. Budget charts, department-level breakdown |
| **Spare Parts Inventory** | Basic inventory tracking, low-stock alerts, linked to asset records |

### Scaling Milestones (Phase 3 — Months 9–14)

| Module | Phase 3 Feature Set |
|---|---|
| **What-If Simulation** | AI scenario engine: energy impact of policy changes, capacity planning simulations |
| **Multi-Property Portfolio** | Campus/portfolio view, cross-building benchmarking, consolidated ESG reporting |
| **Advanced AI** | ML-based predictive maintenance (LSTM/Gradient Boosting), natural language query ("show me energy waste areas this week") |
| **Financial Integration** | API integration with accounting systems (SAP, Oracle), automated cost allocation |
| **White-Label & Multi-Tenant** | Rebrandable UI for system integrator partners, multi-tenant SaaS architecture |
| **Offline Mode** | Progressive Web App (PWA) with offline data caching for technician rounds |
| **API Marketplace** | Public API for third-party integrations, webhook system |

### Decision Gates

| Gate | Criteria | Decision |
|---|---|---|
| MVP → Phase 2 | ≥ 3 pilot deployments, ≥ 80% user adoption, measurable energy savings demonstrated | Proceed to Phase 2 investment |
| Phase 2 → Phase 3 | ≥ 10 paying customers, positive unit economics, AI models validated on real data | Proceed to Phase 3 / seek growth funding |
| Phase 3 → Scale | ≥ 30 customers, platform stability at scale, partnership channel generating > 30% of pipeline | Expand to ASEAN markets |

---

## 7. Feature Prioritization (MoSCoW)

### Must Have (MVP — Non-Negotiable)

| ID | Feature | Justification |
|---|---|---|
| M-1 | JWT authentication + RBAC (3 roles) | Security and compliance foundation |
| M-2 | Real-time energy monitoring (kWh, PF, Peak Load) | Primary ROI driver |
| M-3 | Environmental monitoring (temp, humidity, CO2) | Core comfort and safety visibility |
| M-4 | Asset inventory with health status (G/Y/R) | Technician core workflow |
| M-5 | SVG/PNG floor plan with sensor overlay | Key differentiator from spreadsheet-based tools |
| M-6 | Threshold-based alerts (email + in-app) | Operational necessity |
| M-7 | Role-specific dashboards | Each persona needs a tailored home screen |
| M-8 | MQTT data ingestion pipeline | Primary IoT data pathway |
| M-9 | Responsive mobile web layout | Technician mobile access requirement |
| M-10 | Basic time-series data storage and querying | Foundation for all monitoring |

### Should Have (Phase 2 — High Value)

| ID | Feature | Justification |
|---|---|---|
| S-1 | Bidirectional device control (BACnet/Modbus) | Transforms from monitoring to control platform |
| S-2 | No-code automation (IFTTT rules) | High-value differentiation, reduces vendor dependency |
| S-3 | 3D Digital Twin (Three.js + BIM) | Premium feature, strong demo/sales impact |
| S-4 | ESG score calculation (LEED/Greenship) | Critical for hotel segment, regulatory driver |
| S-5 | Predictive maintenance (statistical) | Shifts to proactive operations model |
| S-6 | Opex vs. Budget financial view | CFO persona key requirement |
| S-7 | Comfort Score Index | Guest/tenant experience differentiator |
| S-8 | Advanced reporting + PDF scheduling | Executive adoption enabler |

### Could Have (Phase 3 — Nice to Have)

| ID | Feature | Justification |
|---|---|---|
| C-1 | What-If simulation engine | Powerful but complex; requires data maturity |
| C-2 | Multi-building portfolio view | Required for scale, not for initial pilots |
| C-3 | ML predictive maintenance | Needs 6+ months of training data |
| C-4 | Natural language dashboard query | UX enhancement, not critical path |
| C-5 | Accounting system integration | Enterprise feature for later |
| C-6 | PWA offline mode | Useful but mobile web with connectivity is sufficient initially |

### Won't Have (This Version / Out of Scope)

| ID | Feature | Rationale |
|---|---|---|
| W-1 | Native mobile app (iOS/Android) | Mobile web provides sufficient mobile access; native adds distribution and maintenance cost |
| W-2 | Built-in CCTV/video analytics | Different domain; integrate via API if needed |
| W-3 | Visitor management system | Adjacent but not core building operations |
| W-4 | Energy trading / grid interaction | Too niche for MVP market |
| W-5 | Custom hardware / edge gateway | Stay hardware-agnostic; rely on existing protocols |

---

## 8. Scaling Roadmap

### Phase 1: Foundation & Validation (Months 1–4)

```
Month 1-2: Core Platform Build
├── Authentication + RBAC (3 roles)
├── MQTT ingestion pipeline + TimescaleDB setup
├── Energy monitoring module (kWh, PF, peak load)
├── Environmental monitoring module (temp, humidity, CO2)
├── Responsive dashboard shell (Next.js + Tailwind)
└── Basic API layer (Node.js/Fastify)

Month 3: Spatial + Asset Modules
├── SVG/PNG floor plan upload + drag-drop sensor mapping
├── Asset inventory + health status (G/Y/R)
├── Threshold-based alerting engine
└── Email + in-app notification system

Month 4: Polish + Pilot Prep
├── Role-specific dashboard views (Executive, Admin, Technician)
├── Basic PDF report export
├── Mobile-responsive optimization
├── Pilot deployment at 1-2 buildings
└── User acceptance testing
```

**Exit Criteria**: 2+ buildings onboarded, core monitoring operational, user feedback collected.

### Phase 2: Intelligence & Control (Months 5–8)

```
Month 5-6: Control Layer
├── BACnet/Modbus gateway integration (bidirectional)
├── Command execution with audit trail
├── No-code automation rule builder (IFTTT)
└── Alert escalation and smart grouping

Month 7-8: Analytics & ESG
├── 3D Digital Twin (Three.js + BIM import)
├── ESG automated scoring (LEED/Greenship)
├── Carbon footprint tracker
├── Statistical anomaly detection for predictive maintenance
├── Comfort Score Index
├── Opex vs. Budget financial view
└── Spare parts inventory (basic)
```

**Exit Criteria**: Bidirectional control proven safe and reliable, ESG reports generated automatically, 10+ buildings onboarded.

### Phase 3: AI & Scale (Months 9–14)

```
Month 9-11: AI & Simulation
├── ML-based predictive maintenance models
├── What-If scenario simulation engine
├── Natural language dashboard query
├── Advanced financial analytics + accounting API integration
└── Portfolio / multi-building view

Month 12-14: Platform & Growth
├── Multi-tenant SaaS architecture
├── White-label capability for SI partners
├── Public API + webhook platform
├── PWA offline support
├── ASEAN market localization (Thailand, Malaysia, Vietnam)
└── SOC 2 / ISO 27001 compliance preparation
```

**Exit Criteria**: 30+ buildings, AI models validated in production, partner channel active, unit economics positive.

---

## 9. Success Metrics & KPIs

### Product Metrics

| KPI | Phase 1 Target | Phase 2 Target | Phase 3 Target |
|---|---|---|---|
| Buildings onboarded | 2–3 (pilot) | 10–15 | 30+ |
| Monthly Active Users (MAU) | 20–30 | 100–150 | 500+ |
| User adoption (% of target users active weekly) | > 70% | > 80% | > 85% |
| Avg. session duration (Admin) | > 15 min/day | > 20 min/day | > 20 min/day |
| Mobile usage share | > 20% | > 30% | > 35% |
| Alert-to-action time (MTTR) | Baseline established | 30% reduction | 50% reduction |

### Business Metrics

| KPI | Phase 1 Target | Phase 2 Target | Phase 3 Target |
|---|---|---|---|
| ARR (Annual Recurring Revenue) | — (pilot/free) | $150K–$500K | $1M–$3M |
| Customer Acquisition Cost (CAC) | — | < $5,000 | < $3,000 |
| Customer Lifetime Value (LTV) | — | > $45,000 | > $60,000 |
| LTV/CAC Ratio | — | > 9:1 | > 20:1 |
| Net Revenue Retention | — | > 110% | > 120% |
| Churn Rate | — | < 10% annual | < 5% annual |

### Impact Metrics (Customer Outcomes)

| KPI | Target | Measurement |
|---|---|---|
| Energy cost reduction | 20–30% vs. baseline | Pre/post kWh and IDR comparison |
| Unplanned downtime reduction | 40% decrease | Incident count comparison |
| ESG report generation time | < 1 minute (from weeks) | Task completion timing |
| Maintenance cost reduction | 15–25% | Opex line item comparison |
| Guest comfort improvement | +10 points on Comfort Score | Composite index tracking |

---

## 10. Risks & Mitigations (Comprehensive)

### Risk Register

| ID | Category | Risk Description | L | I | Score | Mitigation Strategy | Owner |
|---|---|---|---|---|---|---|---|
| R-01 | Scope | Feature sprawl across 10 modules delays MVP | H | H | 9 | Strict MoSCoW enforcement. PM has authority to cut scope. MVP = 4 core modules only. | PM |
| R-02 | Technical | Building protocol heterogeneity (BACnet versions, Modbus variants) causes integration delays | H | H | 9 | Start with MQTT-only in MVP. Build protocol abstraction layer. Add BACnet/Modbus in Phase 2 with per-site testing. | SA |
| R-03 | Technical | Time-series data volume exceeds storage budget at scale | M | H | 6 | Tiered retention policy. Use TimescaleDB compression (10:1). Downsample to 1-min averages after 7 days. | SA |
| R-04 | Market | Slow enterprise sales cycle (6–12 months) delays revenue | H | M | 6 | Offer free pilot program (30 days, 1 floor). Focus on mid-market (faster decisions). Build ROI calculator for sales enablement. | Creator |
| R-05 | Technical | AI/ML models underperform without sufficient training data | M | M | 4 | Phase 1 uses rule-based thresholds only. Collect data for 6+ months before training ML models. Set expectations with customers. | SA |
| R-06 | Adoption | Technicians resist digital workflow change | M | M | 4 | Design for extreme simplicity (< 5 taps to any action). Provide on-site training. Show time-saving impact within first week. | PM |
| R-07 | Security | IoT device commands could be exploited if not properly secured | L | H | 3 | All commands require authentication + role authorization. Audit trail for every command. TLS encryption end-to-end. Command confirmation for critical operations (shutdown, override). | Security |
| R-08 | Compliance | Data sovereignty regulations restrict cloud deployment | L | M | 2 | Design architecture for hybrid deployment (cloud + on-prem). Containerize all services (Docker). No hard dependency on specific cloud provider. | DevOps |
| R-09 | Competition | Enterprise vendor (Siemens/Honeywell) launches mid-market SaaS product | M | M | 4 | Accelerate Indonesian market localization (IDR, Greenship, Bahasa). Build switching costs via automation rules and historical data. Move fast. | Creator |
| R-10 | Financial | Development costs exceed budget before revenue | M | H | 6 | Phased development with clear decision gates. Seek pilot customer co-funding. Consider grant funding (Indonesian green tech initiatives). | Creator |

*L = Likelihood (H/M/L), I = Impact (H/M/L), Score = 1–9 scale*

---

## 11. Guidance to Product Manager

### Immediate PM Decisions to Make

1. **Pilot Customer Selection**: Identify 2–3 buildings for MVP pilot. Recommend prioritizing a hotel (ESG urgency) and an office building (system complexity) to validate both segments simultaneously.

2. **MQTT Broker Strategy**: Decide between managed cloud MQTT (e.g., EMQX Cloud) vs. self-hosted Mosquitto for MVP. This affects infrastructure cost and deployment complexity.

3. **Floor Plan Approach**: Confirm that SVG/PNG 2D floor plans (not 3D BIM) are sufficient for MVP. This dramatically reduces frontend complexity and timeline. 3D via Three.js is Phase 2.

4. **Data Retention Policy**: Define retention tiers (raw data: 7 days, 1-min avg: 90 days, hourly: 2 years) and validate with pilot customers that this meets their reporting needs.

5. **Pricing Model**: Decide on pricing structure for pilot (free vs. discounted) and post-pilot (per-building/month, per-sensor, or tiered by feature set).

6. **Localization Priority**: Confirm whether MVP UI is English-only or requires Bahasa Indonesia. Financial values will be in IDR regardless.

### Questions Requiring Stakeholder Validation

1. **Integration Depth**: Do pilot customers require bidirectional control in Phase 1, or is read-only monitoring sufficient to demonstrate value? (This is a major scope/risk decision.)

2. **Data Ownership**: Who owns the sensor data — the building owner or the platform? What are the data portability requirements? This affects architecture and contract terms.

3. **Uptime SLA**: What uptime commitment is required for pilot? 99.5% is achievable for a SaaS product; 99.9% requires redundancy investment that may not be justified in MVP.

4. **Regulatory Review**: Has legal reviewed Indonesian data protection regulations (PP 71/2019, UU PDP) for processing building sensor data? Any personally identifiable data (occupancy, access logs) may trigger compliance requirements.

5. **Edge Computing**: Do any pilot sites have unreliable internet connectivity that would require edge processing? This significantly affects architecture decisions.

### Recommended Next Strategic Checkpoints

| Checkpoint | Timing | Purpose |
|---|---|---|
| **PM Roadmap Review** | After PM artifact (Stage 2) | Validate feature prioritization and sprint plan against this vision |
| **Architecture Decision Record** | After SA artifact (Stage 3) | Confirm tech stack decisions align with scale requirements |
| **UX Prototype Review** | After UI/UX artifact (Stage 4) | Validate role-specific dashboard designs with representative users |
| **MVP Scope Lock** | End of Week 2 | Final scope freeze for MVP; any additions go to Phase 2 backlog |
| **Pilot Launch Readiness** | End of Month 4 | Go/No-Go for first pilot deployment |
| **Phase 2 Investment Decision** | Month 5 | Based on pilot results, decide Phase 2 scope and investment |

---

## 12. Handoff

### Inputs Consumed
- User's problem statement and project idea describing a Strategic Smart Building Dashboard
- Feature requirements across 10 major modules
- User persona definitions (3 roles: Financial Decision Maker, System Administrator, Technician)
- Suggested technology stack preferences
- Business value targets (20–30% energy efficiency, predictive maintenance shift)

### Outputs Produced
- `.artifacts/01-creator-vision.md` (this document)
  - Complete product vision, value proposition, and strategic goals
  - 4 detailed user personas with needs, frustrations, and decision criteria
  - Market analysis with TAM/SAM/SOM sizing for Indonesian market
  - Competitor landscape analysis (6 competitors mapped)
  - Risk register with 10 identified risks and mitigation strategies
  - MoSCoW feature prioritization (10 Must, 8 Should, 6 Could, 5 Won't)
  - 3-phase scaling roadmap with decision gates
  - Success metrics and KPIs across product, business, and impact dimensions
  - Actionable guidance for Product Manager

### Open Questions

1. **Budget Envelope**: What is the available development budget for Phase 1 (MVP)? This affects team size, timeline, and scope decisions.
2. **Team Composition**: Is there an existing development team, or does the team need to be assembled? What existing building domain expertise is available?
3. **Pilot Customers**: Are pilot customers already identified, or does the PM need to source them? Are there existing relationships with building owners/operators?
4. **Hardware Partnerships**: Is there an existing relationship with IoT sensor/gateway vendors, or will the platform integrate with whatever hardware the customer already has?
5. **Revenue Model**: Is this intended as a SaaS product (recurring revenue) or a licensed/project-based delivery? This affects architecture and go-to-market fundamentally.
6. **Geographic Scope**: Is the initial scope strictly Indonesia, or are there near-term expansion plans to other ASEAN markets that should influence early architecture decisions?
7. **Existing IP**: Is there any existing codebase, prototype, or proof-of-concept to build upon, or is this a greenfield development?

### Go/No-Go Recommendation

**✅ GO — Proceed to Product Manager (Stage 2)**

**Rationale:**
1. **Clear Market Need**: The fragmented state of building management tools in Southeast Asia, combined with ESG regulatory pressure and rising energy costs, creates a genuine and growing market opportunity.
2. **Defensible Differentiation**: The "Boardroom-to-Boiler-Room" positioning, Indonesian market localization, and digital twin democratization provide meaningful differentiation against enterprise incumbents.
3. **Feasible MVP Scope**: By limiting MVP to energy monitoring, environmental monitoring, basic asset health, and 2D spatial views (with MQTT-only integration), the scope is achievable within 4 months by a small team.
4. **Phased Risk Management**: The 3-phase approach with decision gates ensures investment scales with validation. No large upfront commitment required.
5. **Strong ROI Story**: 20–30% energy savings at even a single building provides clear, measurable customer ROI that supports both pilot conversion and pricing justification.

**Conditions for Go:**
- PM must lock MVP scope to Phase 1 features only (no scope creep)
- At least 1 pilot customer must be identified before development begins (Month 1)
- Architecture must support future BACnet/Modbus integration without rewrite, even though MVP is MQTT-only

---

*This document was produced by the Creator Agent and is ready for consumption by the Product Manager Agent (Stage 2). All strategic assertions should be validated against real market data during the PM phase.*
