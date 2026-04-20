'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  BookOpen, Search, Camera, ChevronDown, ChevronRight,
  AlertTriangle, Clock, Wrench, FileText, Package, Star, Upload,
} from 'lucide-react';
import { api } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface KBStep {
  number: number;
  description: string;
  warning?: string;   // yellow callout
  caution?: string;   // red callout
}

interface KBProcedure {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  requiredTools: string[];
  steps: KBStep[];
}

interface KBDocument {
  id: string;
  title: string;
  type: 'manual' | 'datasheet' | 'certificate';
  url: string;
}

interface KBFAQ {
  question: string;
  answer: string;
}

interface KBProduct {
  id: string;
  name: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  category: string;
  imageUrl?: string;
  procedures: KBProcedure[];
  documents: KBDocument[];
  faqs: KBFAQ[];
}

/* ------------------------------------------------------------------ */
/* Mock Data                                                           */
/* ------------------------------------------------------------------ */

const MOCK_PRODUCTS: KBProduct[] = [
  {
    id: 'kb-1',
    name: 'HVAC AHU-3000',
    serialNumber: 'HV-2024-001',
    manufacturer: 'Daikin',
    model: 'AHU-3000',
    category: 'HVAC',
    procedures: [
      {
        id: 'proc-1a',
        title: 'Compressor Troubleshooting',
        difficulty: 'hard',
        estimatedTime: '45–60 min',
        requiredTools: ['Multimeter', 'Manifold gauge set', 'Insulation resistance tester', 'Torque wrench'],
        steps: [
          { number: 1, description: 'Isolate the AHU from the electrical supply and apply lock-out/tag-out (LOTO) procedure.' },
          { number: 2, description: 'Verify 0 V at the compressor terminals with a multimeter.', warning: 'Ensure capacitors are discharged before touching terminals.' },
          { number: 3, description: 'Measure winding resistance between C-S, C-R, and S-R terminals. Compare with OEM specification (C-S: 2.4 Ω ±10%, C-R: 1.8 Ω ±10%).' },
          { number: 4, description: 'Measure insulation resistance (megohm test) between each winding and ground. Must read ≥ 500 MΩ.', caution: 'A reading below 2 MΩ indicates imminent winding failure — do NOT re-energize.' },
          { number: 5, description: 'Inspect the contactor for pitting or welding. Replace if contact resistance exceeds 50 mΩ.' },
          { number: 6, description: 'Check suction and discharge pressures using a manifold gauge set. Suction: 60–70 psig, Discharge: 250–300 psig (R-410A, at 35 °C ambient).' },
          { number: 7, description: 'If pressures are nominal and windings pass, check the capacitor (start and run) with a capacitance meter — must be within ±5% of rated μF.' },
          { number: 8, description: 'Restore power and run the compressor. Monitor amp draw — must not exceed rated RLA on the nameplate.' },
        ],
      },
      {
        id: 'proc-1b',
        title: 'Filter Replacement',
        difficulty: 'easy',
        estimatedTime: '15–20 min',
        requiredTools: ['Screwdriver (Phillips #2)', 'Replacement filter (MERV-13)', 'Vacuum cleaner'],
        steps: [
          { number: 1, description: 'Turn off the AHU fan via the local panel or BMS.' },
          { number: 2, description: 'Open the filter access panel (two quarter-turn fasteners).' },
          { number: 3, description: 'Slide out the old filter. Note the airflow direction arrow.' },
          { number: 4, description: 'Vacuum loose debris from the filter housing.' },
          { number: 5, description: 'Insert the new MERV-13 filter with the airflow arrow matching the duct direction.', warning: 'An incorrectly oriented filter will reduce efficiency by up to 40%.' },
          { number: 6, description: 'Close and secure the access panel. Restart the AHU fan.' },
          { number: 7, description: 'Verify differential pressure across the filter on BMS — should read 0.3–0.5 in.w.g. for a new filter.' },
        ],
      },
      {
        id: 'proc-1c',
        title: 'Refrigerant Charge Check',
        difficulty: 'medium',
        estimatedTime: '30–40 min',
        requiredTools: ['Manifold gauge set', 'Electronic refrigerant scale', 'Thermometer (clamp-on)', 'Leak detector'],
        steps: [
          { number: 1, description: 'Ensure the unit has been running for at least 15 minutes to stabilize.' },
          { number: 2, description: 'Connect manifold gauges to the service ports (low-side: blue, high-side: red).' },
          { number: 3, description: 'Record suction pressure, discharge pressure, and subcooling/superheat.', warning: 'Use proper PPE — refrigerant contact can cause frostbite.' },
          { number: 4, description: 'Compare readings against the charging chart on the unit nameplate.' },
          { number: 5, description: 'If undercharged, use the electronic scale to add refrigerant in 100 g increments. Re-check after each addition.' },
          { number: 6, description: 'Perform a leak check at all brazed joints and service valve connections using an electronic leak detector.' },
          { number: 7, description: 'Log final readings in the maintenance record.' },
        ],
      },
    ],
    documents: [
      { id: 'doc-1a', title: 'AHU-3000 Installation & Service Manual', type: 'manual', url: '#' },
      { id: 'doc-1b', title: 'R-410A Refrigerant Safety Data Sheet', type: 'datasheet', url: '#' },
      { id: 'doc-1c', title: 'MERV-13 Filter Specification', type: 'datasheet', url: '#' },
    ],
    faqs: [
      { question: 'How often should filters be replaced?', answer: 'Every 3 months under normal conditions, or monthly in high-dust environments. Check differential pressure — replace when it exceeds 1.0 in.w.g.' },
      { question: 'What is the normal operating superheat?', answer: 'Superheat should be 10–15 °F (5–8 °C) at the evaporator outlet under normal load. Values above 20 °F suggest low charge or restricted metering device.' },
      { question: 'The compressor trips on overload — what should I check first?', answer: 'Check ambient temperature, condenser coil cleanliness, amp draw vs rated RLA, and refrigerant charge. An excessively dirty condenser coil is the most common cause.' },
    ],
  },
  {
    id: 'kb-2',
    name: 'Chiller CH-500X',
    serialNumber: 'CH-2023-001',
    manufacturer: 'Carrier',
    model: 'CH-500X',
    category: 'Chiller',
    procedures: [
      {
        id: 'proc-2a',
        title: 'Cooling Capacity Loss Diagnosis',
        difficulty: 'hard',
        estimatedTime: '60–90 min',
        requiredTools: ['Manifold gauge set', 'Flow meter', 'Temperature logger', 'Water quality test kit'],
        steps: [
          { number: 1, description: 'Record entering/leaving chilled water temperatures (ECHW/LCHW) and flow rate.' },
          { number: 2, description: 'Calculate actual capacity: Q = flow (GPM) × 500 × ΔT. Compare against design tonnage.' },
          { number: 3, description: 'Check condenser water temperatures — high approach temperature indicates fouled tubes.' },
          { number: 4, description: 'Inspect suction and discharge pressures. Low suction may indicate low refrigerant or restricted flow.' },
          { number: 5, description: 'Check oil level and oil pressure differential.', caution: 'Running a chiller with low oil pressure will cause catastrophic bearing damage.' },
          { number: 6, description: 'Inspect evaporator tubes for fouling — pull a sample tube if accessible.' },
          { number: 7, description: 'Review BMS trend data for compressor loading percentage over the past 48 hours.' },
        ],
      },
      {
        id: 'proc-2b',
        title: 'Condenser Tube Cleaning',
        difficulty: 'medium',
        estimatedTime: '3–4 hours',
        requiredTools: ['Tube brushes (nylon & brass)', 'High-pressure washer', 'Water treatment chemicals', 'End-cover gaskets'],
        steps: [
          { number: 1, description: 'Shut down the chiller and close condenser water isolation valves.' },
          { number: 2, description: 'Drain the condenser waterbox.', warning: 'Water may be extremely hot after shutdown — allow 30 min cool-down.' },
          { number: 3, description: 'Remove the waterbox end covers (typically 16–24 bolts each side).' },
          { number: 4, description: 'Brush each tube with a nylon brush first; use brass brush only for heavy scale.' },
          { number: 5, description: 'Flush tubes with a high-pressure washer from the outlet side.' },
          { number: 6, description: 'Inspect tube sheets for corrosion or pitting. Report any tube leaks.' },
          { number: 7, description: 'Replace end-cover gaskets and re-torque bolts in a star pattern to spec.' },
          { number: 8, description: 'Refill, vent, and restart. Verify no leaks at waterbox flanges.' },
        ],
      },
      {
        id: 'proc-2c',
        title: 'Pressure Anomaly Investigation',
        difficulty: 'medium',
        estimatedTime: '30–45 min',
        requiredTools: ['Manifold gauges', 'Refrigerant analyzer', 'Multimeter'],
        steps: [
          { number: 1, description: 'Record current suction, discharge, and oil pressures from the chiller controller display.' },
          { number: 2, description: 'Compare against baseline values from the last commissioning or service report.' },
          { number: 3, description: 'High discharge pressure + normal suction → likely condenser fouling or high ambient/water temp.' },
          { number: 4, description: 'Low suction pressure + normal discharge → possible low charge, restricted liquid line, or low evaporator load.' },
          { number: 5, description: 'High suction + low discharge → suspect compressor valve leakage. Perform a pump-down test.' },
          { number: 6, description: 'Take a refrigerant sample via the liquid-line port and analyse for non-condensables (air contamination).', warning: 'Use only rated sample cylinders. Never vent refrigerant to atmosphere (EPA/regulation violation).' },
        ],
      },
    ],
    documents: [
      { id: 'doc-2a', title: 'CH-500X Operation & Maintenance Manual', type: 'manual', url: '#' },
      { id: 'doc-2b', title: 'Carrier Chiller Diagnostic Codes Reference', type: 'datasheet', url: '#' },
    ],
    faqs: [
      { question: 'What is the recommended condenser cleaning interval?', answer: 'Semi-annually for systems using cooling towers. Quarterly if water treatment is poor or TDS > 1500 ppm.' },
      { question: 'The chiller shows "High Discharge Pressure" fault — can I reset it?', answer: 'Do NOT reset without investigating the cause. Common causes: dirty condenser tubes, condenser fan/pump failure, non-condensables, or overcharge. Repeatedly resetting can cause compressor mechanical damage.' },
    ],
  },
  {
    id: 'kb-3',
    name: 'UPS Symmetra PX',
    serialNumber: 'UPS-2024-001',
    manufacturer: 'APC / Schneider Electric',
    model: 'Symmetra PX 100kW',
    category: 'Power',
    procedures: [
      {
        id: 'proc-3a',
        title: 'Battery Module Replacement',
        difficulty: 'medium',
        estimatedTime: '20–30 min per module',
        requiredTools: ['Insulated gloves (Class 0)', 'Battery lifting handle', 'Torque wrench', 'Multimeter'],
        steps: [
          { number: 1, description: 'Identify the failing battery module from the UPS management interface (amber LED or "Replace Battery" alarm).' },
          { number: 2, description: 'Ensure the UPS is on mains power and NOT on battery.', caution: 'Replacing batteries while UPS is on battery will cause load drop. Verify bypass is available.' },
          { number: 3, description: 'Put on Class 0 insulated gloves before handling any battery module.' },
          { number: 4, description: 'Unlatch the battery module tray and slide it out using the lifting handle.' },
          { number: 5, description: 'Verify the replacement module voltage matches (nominal 48 VDC per module).', warning: 'Mismatched battery modules can cause thermal runaway.' },
          { number: 6, description: 'Slide in the new module until the connector latches. Verify green LED on the module.' },
          { number: 7, description: 'From the management interface, initiate a runtime calibration to update remaining capacity.' },
        ],
      },
      {
        id: 'proc-3b',
        title: 'Switching to Maintenance Bypass',
        difficulty: 'hard',
        estimatedTime: '10–15 min',
        requiredTools: ['UPS key (maintenance bypass)', 'Multimeter'],
        steps: [
          { number: 1, description: 'Notify all stakeholders before transferring to bypass — load will be unprotected.' },
          { number: 2, description: 'On the UPS display, navigate to Control → Internal Bypass → Enable. Wait for sync confirmation.' },
          { number: 3, description: 'Verify output voltage and frequency match utility on the display.' },
          { number: 4, description: 'Turn the maintenance bypass switch to the BYPASS position using the UPS key.' },
          { number: 5, description: 'Verify the "On Bypass" LED is solid. Measure output voltage at the downstream panel to confirm.', caution: 'Load is now unprotected. Any utility anomaly will directly impact the critical load.' },
          { number: 6, description: 'Perform required maintenance. When done, reverse the procedure: switch back to NORMAL, disable internal bypass, and verify "Online" status.' },
        ],
      },
      {
        id: 'proc-3c',
        title: 'Firmware Update',
        difficulty: 'medium',
        estimatedTime: '30–45 min',
        requiredTools: ['Laptop with APC Firmware Upgrade Utility', 'USB cable (Type-B)', 'Firmware file from APC downloads portal'],
        steps: [
          { number: 1, description: 'Download the latest firmware from the Schneider Electric download portal. Verify the SHA-256 checksum.' },
          { number: 2, description: 'Connect the laptop to the UPS management port via USB.' },
          { number: 3, description: 'Launch the Firmware Upgrade Utility. Select the correct UPS model and firmware file.' },
          { number: 4, description: 'The utility will validate compatibility. Do NOT proceed if a mismatch warning appears.' },
          { number: 5, description: 'Start the upgrade. The UPS NMC will reboot — this does NOT affect power to the load.' },
          { number: 6, description: 'After reboot (~3 min), verify the new firmware version on the management display.' },
          { number: 7, description: 'Test SNMP/Modbus connectivity to BMS to ensure communication is restored.' },
        ],
      },
    ],
    documents: [
      { id: 'doc-3a', title: 'Symmetra PX 100kW User Manual', type: 'manual', url: '#' },
      { id: 'doc-3b', title: 'Battery MSDS — VRLA 12V 9Ah', type: 'datasheet', url: '#' },
      { id: 'doc-3c', title: 'UPS Preventive Maintenance Certificate Template', type: 'certificate', url: '#' },
    ],
    faqs: [
      { question: 'How long do UPS batteries last?', answer: 'Typical design life is 3–5 years for standard VRLA batteries. In environments above 25 °C, battery life is halved for every 10 °C increase.' },
      { question: 'The UPS keeps switching to battery — utility seems fine. Why?', answer: 'Check input voltage and frequency windows in the UPS configuration. A tight window (e.g., ±5% voltage) can cause frequent transfers. Also check for voltage sags/swells using a power quality analyzer.' },
    ],
  },
  {
    id: 'kb-4',
    name: 'Elevator Gen3',
    serialNumber: 'EL-2022-001',
    manufacturer: 'Otis',
    model: 'Gen3',
    category: 'Elevator',
    procedures: [
      {
        id: 'proc-4a',
        title: 'Door Alignment Adjustment',
        difficulty: 'medium',
        estimatedTime: '30–45 min',
        requiredTools: ['Door gap gauge', 'Allen key set (metric)', 'Feeler gauge', 'Level'],
        steps: [
          { number: 1, description: 'Put the elevator in inspection mode using the car-top inspection station.' },
          { number: 2, description: 'Open doors manually using the car-top door operator switch.' },
          { number: 3, description: 'Measure the gap between the car door and landing door using a feeler gauge. Must be ≤ 6 mm per code (ASME A17.1).' },
          { number: 4, description: 'If gap is out of tolerance, loosen the door hanger roller adjustment bolts (4 mm Allen key).' },
          { number: 5, description: 'Adjust top and bottom rollers until the door panel is plumb (use level) and gap is uniform.' },
          { number: 6, description: 'Re-tighten bolts and run doors through 10 open/close cycles. Verify smooth operation.', warning: 'Keep hands clear of the door track and closing edges during cycling.' },
          { number: 7, description: 'Return elevator to normal service. Document adjustment in the maintenance log.' },
        ],
      },
      {
        id: 'proc-4b',
        title: 'Motor & Drive Inspection',
        difficulty: 'hard',
        estimatedTime: '60–90 min',
        requiredTools: ['Vibration analyzer', 'Infrared thermometer', 'Multimeter', 'Insulation tester'],
        steps: [
          { number: 1, description: 'Position the car at the top floor and engage the car-top inspection mode.' },
          { number: 2, description: 'Measure motor winding insulation resistance (phase-to-ground). Must be ≥ 100 MΩ.' },
          { number: 3, description: 'Record vibration levels at the motor drive-end and non-drive-end bearings. Refer to ISO 10816 limits.' },
          { number: 4, description: 'Check belt/sheave alignment (for geared machines) or coupling alignment (gearless).', caution: 'Misalignment causes premature bearing failure — replace rather than adjust if wear exceeds 2 mm.' },
          { number: 5, description: 'Inspect drive capacitor bank and DC bus voltage. Capacitor swelling indicates end-of-life.' },
          { number: 6, description: 'Check the encoder coupling for looseness or wear. A loose encoder causes erratic leveling.' },
          { number: 7, description: 'Record all measurements in the elevator PM logbook.' },
        ],
      },
      {
        id: 'proc-4c',
        title: 'Emergency Manual Release',
        difficulty: 'easy',
        estimatedTime: '5–10 min',
        requiredTools: ['Elevator emergency key', 'Flashlight', 'Two-way radio'],
        steps: [
          { number: 1, description: 'Communicate with trapped passengers via the car intercom. Assure them help is on the way.' },
          { number: 2, description: 'Locate the nearest landing door to the stalled car position (check floor indicators).', warning: 'NEVER attempt to move the car by releasing the brake if the car position is unknown.' },
          { number: 3, description: 'Insert the emergency key into the landing door keyhole and turn to release the interlock.' },
          { number: 4, description: 'Manually open the landing door and the car door.' },
          { number: 5, description: 'If the car is level with the floor (±150 mm), assist passengers to exit.', caution: 'If the car is NOT level, do NOT allow passengers to exit — call a certified elevator technician for car repositioning.' },
          { number: 6, description: 'Once evacuation is complete, close and lock doors. Report the incident and await technician inspection before returning to service.' },
        ],
      },
    ],
    documents: [
      { id: 'doc-4a', title: 'Otis Gen3 Maintenance Manual', type: 'manual', url: '#' },
      { id: 'doc-4b', title: 'ASME A17.1 Elevator Code Reference', type: 'datasheet', url: '#' },
    ],
    faqs: [
      { question: 'How often should elevator doors be adjusted?', answer: 'Check door gap and alignment quarterly. Full door operator overhaul every 5 years or per OEM recommendation.' },
      { question: 'Elevator stops between floors — what is the likely cause?', answer: 'Common causes: door interlock switch failure (most common), safety circuit relay fault, encoder signal loss, or drive fault. Check the controller fault log first.' },
    ],
  },
  {
    id: 'kb-5',
    name: 'Fire Panel FP-2000',
    serialNumber: 'FS-2023-001',
    manufacturer: 'Honeywell',
    model: 'FP-2000',
    category: 'Fire Safety',
    procedures: [
      {
        id: 'proc-5a',
        title: 'Smoke Detector Sensor Calibration',
        difficulty: 'medium',
        estimatedTime: '5 min per detector',
        requiredTools: ['Calibrated smoke aerosol (EN 54 compliant)', 'Extension pole with detector cup', 'Panel access code'],
        steps: [
          { number: 1, description: 'Put the relevant zone into TEST mode on the fire panel to prevent false alarm activation.' },
          { number: 2, description: 'Attach the aerosol dispenser to the extension pole cup.' },
          { number: 3, description: 'Position the cup over the detector and dispense a short burst of test aerosol (2–3 seconds).' },
          { number: 4, description: 'The detector should alarm within 30 seconds. Verify the panel shows the correct zone and device address.' },
          { number: 5, description: 'If the detector fails to alarm, check sensitivity setting on the panel. If set correctly, replace the detector.', warning: 'Do NOT increase sensitivity beyond manufacturer recommendation — it causes nuisance alarms.' },
          { number: 6, description: 'Clear the alarm on the panel and move to the next detector.' },
          { number: 7, description: 'After testing all detectors in the zone, return the zone to NORMAL mode.' },
        ],
      },
      {
        id: 'proc-5b',
        title: 'Zone Programming',
        difficulty: 'hard',
        estimatedTime: '30–60 min',
        requiredTools: ['Panel programming manual', 'Laptop with FP-2000 Config Utility', 'RS-232 or USB cable'],
        steps: [
          { number: 1, description: 'Back up the current panel configuration before making changes.' },
          { number: 2, description: 'Connect the laptop to the panel programming port.', caution: 'Programming changes on a live panel can activate outputs — coordinate with building management.' },
          { number: 3, description: 'In the Config Utility, navigate to Zone Configuration.' },
          { number: 4, description: 'Add or modify zone parameters: zone number, zone label, zone type (smoke/heat/manual), and associated output relays.' },
          { number: 5, description: 'Set cross-zone verification if required by local code (two detectors in alarm before output activation).' },
          { number: 6, description: 'Upload the configuration to the panel. The panel will restart (~60 seconds).' },
          { number: 7, description: 'Walk-test each modified zone to verify correct operation. Document changes in the fire system logbook.' },
        ],
      },
      {
        id: 'proc-5c',
        title: 'Panel Battery Test & Replacement',
        difficulty: 'easy',
        estimatedTime: '15–20 min',
        requiredTools: ['Multimeter', 'Replacement batteries (2 × 12V 7Ah SLA)', 'Phillips screwdriver'],
        steps: [
          { number: 1, description: 'Notify the fire monitoring company that a battery test/replacement is being performed.' },
          { number: 2, description: 'Open the panel enclosure using the panel key.' },
          { number: 3, description: 'Measure each battery: open-circuit voltage should be 12.4–13.0 VDC. Below 12.0 VDC = replace.' },
          { number: 4, description: 'Disconnect the old batteries (negative terminal first to avoid short circuit).', warning: 'SLA batteries contain sulfuric acid — handle with care and dispose per local regulations.' },
          { number: 5, description: 'Connect new batteries (positive terminal first). Verify the panel "Battery Trouble" LED clears.' },
          { number: 6, description: 'Perform a supervised battery load test from the panel menu — the panel draws from batteries for 15 seconds and verifies capacity.' },
          { number: 7, description: 'Close the enclosure. Notify the monitoring company that testing is complete.' },
        ],
      },
    ],
    documents: [
      { id: 'doc-5a', title: 'FP-2000 Installation & Programming Guide', type: 'manual', url: '#' },
      { id: 'doc-5b', title: 'NFPA 72 Quick Reference Card', type: 'datasheet', url: '#' },
      { id: 'doc-5c', title: 'Annual Fire Inspection Certificate Template', type: 'certificate', url: '#' },
    ],
    faqs: [
      { question: 'How often should fire panel batteries be replaced?', answer: 'Every 3–4 years regardless of test results, as SLA batteries degrade internally. Annual load testing is mandatory per NFPA 72.' },
      { question: 'A detector shows "Dirty" on the panel — what does that mean?', answer: 'The detector\'s optical chamber has accumulated dust. Sensitivity has drifted and the detector may not respond correctly. Remove, clean, and recalibrate — or replace if beyond compensation range.' },
      { question: 'Can I silence a fire alarm during testing?', answer: 'Yes — use the panel\'s TEST mode or SILENCE function during detector walk-tests. Always coordinate with the monitoring company first to prevent fire department dispatch.' },
    ],
  },
];

const PRODUCT_NAMES = MOCK_PRODUCTS.map(p => ({ id: p.id, name: p.name, category: p.category }));

/* ------------------------------------------------------------------ */
/* Helper Components                                                   */
/* ------------------------------------------------------------------ */

function DifficultyBadge({ level }: { level: 'easy' | 'medium' | 'hard' }) {
  const styles = {
    easy: 'bg-green-500/10 text-green-400 border-green-500/20',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    hard: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${styles[level]}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

function ProcedureAccordion({ procedure }: { procedure: KBProcedure }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {open ? <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />}
          <span className="text-sm font-medium text-slate-200 truncate">{procedure.title}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          <DifficultyBadge level={procedure.difficulty} />
          <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" /> {procedure.estimatedTime}
          </span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-700/50">
          {/* Meta info */}
          <div className="flex flex-wrap gap-4 py-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {procedure.estimatedTime}</span>
            <span className="flex items-center gap-1"><Wrench className="h-3.5 w-3.5" /> {procedure.requiredTools.length} tools required</span>
          </div>

          {/* Required tools */}
          <div className="mb-4">
            <p className="text-xs font-medium text-slate-300 mb-2">Required Tools:</p>
            <div className="flex flex-wrap gap-1.5">
              {procedure.requiredTools.map((tool, i) => (
                <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                  {tool}
                </span>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {procedure.steps.map((step) => (
              <div key={step.number} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-bold">
                  {step.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 leading-relaxed">{step.description}</p>
                  {step.warning && (
                    <div className="mt-2 flex gap-2 items-start bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-300">{step.warning}</p>
                    </div>
                  )}
                  {step.caution && (
                    <div className="mt-2 flex gap-2 items-start bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                      <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300">{step.caution}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function KnowledgeBasePage() {
  const [serialQuery, setSerialQuery] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [nameSuggestions, setNameSuggestions] = useState<typeof PRODUCT_NAMES>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageAnalyzing, setImageAnalyzing] = useState(false);
  const [results, setResults] = useState<KBProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedFaqs, setExpandedFaqs] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        nameInputRef.current &&
        !nameInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchBySerial = useCallback(async () => {
    if (!serialQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get<{ data: KBProduct[] }>('/knowledge-base/search', { q: serialQuery.trim(), type: 'serial' });
      setResults(res.data ?? []);
    } catch {
      // Fallback to mock data
      const found = MOCK_PRODUCTS.filter(p =>
        p.serialNumber.toLowerCase().includes(serialQuery.trim().toLowerCase())
      );
      setResults(found);
    }
    setLoading(false);
  }, [serialQuery]);

  const searchByName = useCallback(async (name?: string) => {
    const q = name ?? nameQuery;
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    setShowSuggestions(false);
    try {
      const res = await api.get<{ data: KBProduct[] }>('/knowledge-base/search', { q: q.trim(), type: 'name' });
      setResults(res.data ?? []);
    } catch {
      const found = MOCK_PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(q.trim().toLowerCase()) ||
        p.category.toLowerCase().includes(q.trim().toLowerCase()) ||
        p.manufacturer.toLowerCase().includes(q.trim().toLowerCase())
      );
      setResults(found);
    }
    setLoading(false);
  }, [nameQuery]);

  const handleNameInput = (value: string) => {
    setNameQuery(value);
    if (value.trim().length > 0) {
      const filtered = PRODUCT_NAMES.filter(p =>
        p.name.toLowerCase().includes(value.toLowerCase()) ||
        p.category.toLowerCase().includes(value.toLowerCase())
      );
      setNameSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (name: string) => {
    setNameQuery(name);
    setShowSuggestions(false);
    searchByName(name);
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageAnalyzing(true);
    setSearched(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      // The apiFetch function handles FormData correctly
      const res = await api.post<{ data: KBProduct[] }>('/knowledge-base/search?type=image', formData);
      setResults(res.data ?? []);
    } catch {
      // Simulate AI analysis delay, then return a random product
      await new Promise(resolve => setTimeout(resolve, 2000));
      const idx = Math.floor(Math.random() * MOCK_PRODUCTS.length);
      setResults([MOCK_PRODUCTS[idx]]);
    }
    setImageAnalyzing(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleFaq = (key: string) => {
    setExpandedFaqs(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <BookOpen className="h-7 w-7 text-blue-400" />
          <h1 className="text-3xl font-bold text-slate-50">Knowledge Base</h1>
        </div>
        <p className="text-sm text-slate-400 mt-1">Troubleshooting guides, procedures, and reference documents for building equipment</p>
      </div>

      {/* Search Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Serial Number Search */}
        <div className="card">
          <label className="label flex items-center gap-2">
            <Search className="h-4 w-4" /> Search by Serial Number
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. HV-2024-001"
              value={serialQuery}
              onChange={(e) => setSerialQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchBySerial()}
              className="input-field"
            />
            <button onClick={searchBySerial} className="btn-primary flex-shrink-0">
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Product Name Search */}
        <div className="card relative">
          <label className="label flex items-center gap-2">
            <Package className="h-4 w-4" /> Search by Product Name
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={nameInputRef}
                type="text"
                placeholder="e.g. HVAC, Chiller, UPS"
                value={nameQuery}
                onChange={(e) => handleNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchByName()}
                onFocus={() => { if (nameSuggestions.length > 0) setShowSuggestions(true); }}
                className="input-field"
              />
              {showSuggestions && (
                <div
                  ref={suggestionsRef}
                  className="absolute left-0 right-0 top-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto"
                >
                  {nameSuggestions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectSuggestion(s.name)}
                      className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 transition-colors flex items-center justify-between"
                    >
                      <span>{s.name}</span>
                      <span className="text-xs text-slate-400">{s.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => searchByName()} className="btn-primary flex-shrink-0">
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Image Search */}
        <div className="card">
          <label className="label flex items-center gap-2">
            <Camera className="h-4 w-4" /> Search by Image
          </label>
          {imagePreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Uploaded equipment" className="w-full h-28 object-cover rounded-lg border border-slate-600" />
              {imageAnalyzing && (
                <div className="absolute inset-0 bg-slate-900/80 rounded-lg flex flex-col items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-blue-500" />
                  <span className="text-xs text-blue-400 font-medium">AI Analyzing...</span>
                </div>
              )}
              {!imageAnalyzing && (
                <button onClick={clearImage} className="absolute top-2 right-2 bg-slate-800/80 rounded-full p-1 text-slate-400 hover:text-white">
                  ✕
                </button>
              )}
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-600 rounded-lg h-28 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500/50 hover:bg-slate-700/30 transition-colors"
            >
              <Upload className="h-6 w-6 text-slate-500" />
              <span className="text-xs text-slate-400">Drag & drop or click to upload</span>
              <span className="text-[10px] text-slate-500">JPG, PNG, WEBP</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner size="lg" className="py-20" label="Searching knowledge base..." />
      ) : searched && results.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No matching equipment found</p>
          <p className="text-xs text-slate-600 mt-1">Try a different serial number, product name, or image</p>
        </div>
      ) : (
        <div className="space-y-6">
          {results.map((product) => (
            <div key={product.id} className="space-y-4">
              {/* Product Card */}
              <div className="card">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Image placeholder */}
                  <div className="w-full sm:w-40 h-32 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="h-12 w-12 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-slate-50">{product.name}</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 mt-3 text-sm">
                      <div><span className="text-slate-400">Serial:</span> <span className="text-slate-200 font-mono">{product.serialNumber}</span></div>
                      <div><span className="text-slate-400">Manufacturer:</span> <span className="text-slate-200">{product.manufacturer}</span></div>
                      <div><span className="text-slate-400">Model:</span> <span className="text-slate-200">{product.model}</span></div>
                      <div><span className="text-slate-400">Category:</span> <span className="text-slate-200">{product.category}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Troubleshooting Procedures */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-400" /> Troubleshooting Procedures
                </h3>
                <div className="space-y-2">
                  {product.procedures.map((proc) => (
                    <ProcedureAccordion key={proc.id} procedure={proc} />
                  ))}
                </div>
              </div>

              {/* Related Documents */}
              {product.documents.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" /> Related Documents
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {product.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.url}
                        className="card flex items-center gap-3 hover:bg-slate-700/80 transition-colors !p-3"
                      >
                        <div className="p-2 bg-slate-700 rounded-lg">
                          <FileText className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-200 truncate">{doc.title}</p>
                          <p className="text-xs text-slate-500 capitalize">{doc.type}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* FAQ */}
              {product.faqs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-blue-400" /> Frequently Asked Questions
                  </h3>
                  <div className="space-y-2">
                    {product.faqs.map((faq, idx) => {
                      const key = `${product.id}-faq-${idx}`;
                      const isOpen = expandedFaqs.has(key);
                      return (
                        <div key={key} className="border border-slate-700 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleFaq(key)}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-700/50 transition-colors"
                          >
                            {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />}
                            <span className="text-sm text-slate-200">{faq.question}</span>
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-3 pl-10">
                              <p className="text-sm text-slate-400 leading-relaxed">{faq.answer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Divider between products */}
              {results.indexOf(product) < results.length - 1 && (
                <hr className="border-slate-700/50" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick Access Grid (when no search yet) */}
      {!searched && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Browse All Equipment</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MOCK_PRODUCTS.map((product) => (
              <button
                key={product.id}
                onClick={() => { setResults([product]); setSearched(true); }}
                className="card text-left hover:bg-slate-700/80 hover:border-blue-500/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-700 rounded-lg">
                    <Package className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{product.name}</p>
                    <p className="text-xs text-slate-400">{product.serialNumber} · {product.manufacturer}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{product.procedures.length} procedures · {product.faqs.length} FAQs</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
