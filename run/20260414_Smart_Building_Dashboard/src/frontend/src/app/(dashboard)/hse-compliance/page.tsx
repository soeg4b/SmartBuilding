'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, ClipboardCheck, UserCheck, AlertTriangle,
  CheckCircle, XCircle, HardHat, Camera, Users, Clock,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ChecklistQuestion {
  id: string;
  text: string;
  criticality: 'block' | 'warn'; // block = "No" means not cleared
}

interface ChecklistEntry {
  id: string;
  submittedAt: string;
  answers: Record<string, boolean>;
  clearedForWork: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  checklistStatus: 'completed' | 'pending' | 'failed';
  clearedForWork: boolean;
  ppeStatus: 'pass' | 'partial' | 'fail' | 'pending';
  submittedAt: string | null;
}

interface PPEItem {
  item: string;
  passed: boolean;
}

interface PPECheck {
  id: string;
  technicianId: string;
  technicianName: string;
  timestamp: string;
  items: PPEItem[];
  complianceScore: number;
  photoUrl?: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const CHECKLIST_QUESTIONS: ChecklistQuestion[] = [
  { id: 'q1', text: 'Are you feeling physically well today?', criticality: 'block' },
  { id: 'q2', text: 'Did you get adequate rest (minimum 7 hours)?', criticality: 'warn' },
  { id: 'q3', text: 'Are you free from the influence of alcohol or drugs?', criticality: 'block' },
  { id: 'q4', text: 'Do you have any injuries that might affect your work?', criticality: 'warn' },
  { id: 'q5', text: 'Are you aware of today\'s safety briefing?', criticality: 'block' },
  { id: 'q6', text: 'Have you inspected your PPE (Personal Protective Equipment)?', criticality: 'block' },
  { id: 'q7', text: 'Do you have your required safety certifications on-site?', criticality: 'block' },
  { id: 'q8', text: 'Are you familiar with the emergency procedures for your work area?', criticality: 'block' },
  { id: 'q9', text: 'Have you completed the required safety training for today\'s tasks?', criticality: 'block' },
  { id: 'q10', text: 'Do you consent to random safety inspection during your shift?', criticality: 'warn' },
];

// Q4 is inverted — "Yes" = has injury = blocking
const INVERTED_QUESTIONS = new Set(['q4']);

function evaluateClearance(answers: Record<string, boolean>): boolean {
  for (const q of CHECKLIST_QUESTIONS) {
    if (q.criticality !== 'block') continue;
    const answer = answers[q.id];
    if (answer === undefined) return false;
    if (INVERTED_QUESTIONS.has(q.id)) {
      // "Yes I have injuries" → not cleared
      if (answer === true) return false;
    } else {
      if (answer === false) return false;
    }
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Mock Data                                                           */
/* ------------------------------------------------------------------ */

const MOCK_HISTORY: ChecklistEntry[] = [
  {
    id: 'cl-1', submittedAt: '2026-04-14T07:15:00Z',
    answers: { q1: true, q2: true, q3: true, q4: false, q5: true, q6: true, q7: true, q8: true, q9: true, q10: true },
    clearedForWork: true,
  },
  {
    id: 'cl-2', submittedAt: '2026-04-13T07:22:00Z',
    answers: { q1: true, q2: false, q3: true, q4: false, q5: true, q6: true, q7: true, q8: true, q9: true, q10: true },
    clearedForWork: true,
  },
  {
    id: 'cl-3', submittedAt: '2026-04-12T07:05:00Z',
    answers: { q1: true, q2: true, q3: true, q4: false, q5: true, q6: true, q7: true, q8: true, q9: true, q10: false },
    clearedForWork: true,
  },
  {
    id: 'cl-4', submittedAt: '2026-04-11T07:30:00Z',
    answers: { q1: true, q2: true, q3: true, q4: true, q5: true, q6: true, q7: true, q8: true, q9: true, q10: true },
    clearedForWork: false,
  },
  {
    id: 'cl-5', submittedAt: '2026-04-10T07:10:00Z',
    answers: { q1: true, q2: true, q3: true, q4: false, q5: true, q6: true, q7: true, q8: true, q9: true, q10: true },
    clearedForWork: true,
  },
];

const MOCK_TEAM: TeamMember[] = [
  { id: 't1', name: 'Ahmad Fauzi', role: 'HVAC Technician', checklistStatus: 'completed', clearedForWork: true, ppeStatus: 'pass', submittedAt: '2026-04-15T07:15:00Z' },
  { id: 't2', name: 'Budi Santoso', role: 'Electrical Technician', checklistStatus: 'completed', clearedForWork: true, ppeStatus: 'pass', submittedAt: '2026-04-15T07:22:00Z' },
  { id: 't3', name: 'Cahya Dewi', role: 'Fire Safety Specialist', checklistStatus: 'completed', clearedForWork: false, ppeStatus: 'partial', submittedAt: '2026-04-15T07:45:00Z' },
  { id: 't4', name: 'Dimas Prasetyo', role: 'Elevator Technician', checklistStatus: 'pending', clearedForWork: false, ppeStatus: 'pending', submittedAt: null },
  { id: 't5', name: 'Eka Wijaya', role: 'General Maintenance', checklistStatus: 'completed', clearedForWork: true, ppeStatus: 'pass', submittedAt: '2026-04-15T06:58:00Z' },
  { id: 't6', name: 'Farhan Rizki', role: 'Plumbing Technician', checklistStatus: 'pending', clearedForWork: false, ppeStatus: 'pending', submittedAt: null },
  { id: 't7', name: 'Gilang Ramadhan', role: 'HVAC Technician', checklistStatus: 'completed', clearedForWork: true, ppeStatus: 'pass', submittedAt: '2026-04-15T07:10:00Z' },
  { id: 't8', name: 'Hana Permata', role: 'BMS Operator', checklistStatus: 'completed', clearedForWork: true, ppeStatus: 'pass', submittedAt: '2026-04-15T07:05:00Z' },
];

const MOCK_PPE: PPECheck[] = [
  {
    id: 'ppe-1', technicianId: 't1', technicianName: 'Ahmad Fauzi', timestamp: '2026-04-15T07:18:00Z',
    items: [
      { item: 'Helmet', passed: true }, { item: 'Safety Vest', passed: true }, { item: 'Boots', passed: true },
      { item: 'Gloves', passed: true }, { item: 'Goggles', passed: true }, { item: 'Tools', passed: true },
    ],
    complianceScore: 100,
  },
  {
    id: 'ppe-2', technicianId: 't2', technicianName: 'Budi Santoso', timestamp: '2026-04-15T07:25:00Z',
    items: [
      { item: 'Helmet', passed: true }, { item: 'Safety Vest', passed: true }, { item: 'Boots', passed: true },
      { item: 'Gloves', passed: true }, { item: 'Goggles', passed: true }, { item: 'Tools', passed: true },
    ],
    complianceScore: 100,
  },
  {
    id: 'ppe-3', technicianId: 't3', technicianName: 'Cahya Dewi', timestamp: '2026-04-15T07:48:00Z',
    items: [
      { item: 'Helmet', passed: true }, { item: 'Safety Vest', passed: true }, { item: 'Boots', passed: true },
      { item: 'Gloves', passed: true }, { item: 'Goggles', passed: false }, { item: 'Tools', passed: true },
    ],
    complianceScore: 83,
  },
  {
    id: 'ppe-4', technicianId: 't5', technicianName: 'Eka Wijaya', timestamp: '2026-04-15T07:02:00Z',
    items: [
      { item: 'Helmet', passed: true }, { item: 'Safety Vest', passed: true }, { item: 'Boots', passed: true },
      { item: 'Gloves', passed: true }, { item: 'Goggles', passed: true }, { item: 'Tools', passed: true },
    ],
    complianceScore: 100,
  },
  {
    id: 'ppe-5', technicianId: 't7', technicianName: 'Gilang Ramadhan', timestamp: '2026-04-15T07:14:00Z',
    items: [
      { item: 'Helmet', passed: true }, { item: 'Safety Vest', passed: true }, { item: 'Boots', passed: true },
      { item: 'Gloves', passed: false }, { item: 'Goggles', passed: true }, { item: 'Tools', passed: true },
    ],
    complianceScore: 83,
  },
  {
    id: 'ppe-6', technicianId: 't8', technicianName: 'Hana Permata', timestamp: '2026-04-15T07:08:00Z',
    items: [
      { item: 'Helmet', passed: true }, { item: 'Safety Vest', passed: true }, { item: 'Boots', passed: true },
      { item: 'Gloves', passed: true }, { item: 'Goggles', passed: true }, { item: 'Tools', passed: true },
    ],
    complianceScore: 100,
  },
];

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function ToggleSwitch({ value, onChange, disabled }: { value: boolean | null; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
          value === true
            ? 'bg-green-500 text-white'
            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        YES
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
          value === false
            ? 'bg-red-500 text-white'
            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        NO
      </button>
    </div>
  );
}

function PPEItemDisplay({ item, passed }: { item: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {passed ? (
        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
      )}
      <span className={passed ? 'text-slate-300' : 'text-red-300'}>{item}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function HSECompliancePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'sys_admin';

  const [activeTab, setActiveTab] = useState<'checklist' | 'team' | 'ppe'>('checklist');

  // Checklist state
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [todaySubmitted, setTodaySubmitted] = useState(false);
  const [todayClearedForWork, setTodayClearedForWork] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<ChecklistEntry[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(true);

  // Team state
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // PPE state
  const [ppeChecks, setPpeChecks] = useState<PPECheck[]>([]);
  const [loadingPpe, setLoadingPpe] = useState(false);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Load today's checklist status
  useEffect(() => {
    (async () => {
      setLoadingChecklist(true);
      try {
        const res = await api.get<{ data: { submitted: boolean; answers?: Record<string, boolean>; clearedForWork?: boolean; submittedAt?: string } }>('/hse/checklist/today');
        if (res.data.submitted) {
          setTodaySubmitted(true);
          setTodayClearedForWork(res.data.clearedForWork ?? null);
          if (res.data.answers) {
            const mapped: Record<string, boolean | null> = {};
            for (const [k, v] of Object.entries(res.data.answers)) mapped[k] = v;
            setAnswers(mapped);
          }
        }
      } catch {
        // Demo — not submitted yet
      }
      // Load history
      try {
        const res = await api.get<{ data: ChecklistEntry[] }>('/hse/checklist/history');
        setHistory(res.data ?? []);
      } catch {
        setHistory(MOCK_HISTORY);
      }
      setLoadingChecklist(false);
    })();
  }, []);

  // Load team compliance data (admin)
  useEffect(() => {
    if (activeTab !== 'team') return;
    (async () => {
      setLoadingTeam(true);
      try {
        const res = await api.get<{ data: TeamMember[] }>('/hse/team-compliance');
        setTeam(res.data ?? []);
      } catch {
        setTeam(MOCK_TEAM);
      }
      setLoadingTeam(false);
    })();
  }, [activeTab]);

  // Load PPE data
  useEffect(() => {
    if (activeTab !== 'ppe') return;
    (async () => {
      setLoadingPpe(true);
      try {
        const res = await api.get<{ data: PPECheck[] }>('/hse/ppe-status');
        setPpeChecks(res.data ?? []);
      } catch {
        setPpeChecks(MOCK_PPE);
      }
      setLoadingPpe(false);
    })();
  }, [activeTab]);

  const handleAnswerChange = (qId: string, value: boolean) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const allAnswered = CHECKLIST_QUESTIONS.every((q) => answers[q.id] !== undefined && answers[q.id] !== null);

  const handleSubmit = useCallback(async () => {
    if (!allAnswered) return;
    setSubmitting(true);
    const boolAnswers: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(answers)) {
      if (v !== null) boolAnswers[k] = v;
    }
    const cleared = evaluateClearance(boolAnswers);

    try {
      const res = await api.post<{ data: { clearedForWork: boolean } }>('/hse/checklist', { answers: boolAnswers });
      setTodayClearedForWork(res.data.clearedForWork);
    } catch {
      // Demo fallback
      setTodayClearedForWork(cleared);
    }
    setTodaySubmitted(true);
    setSubmitting(false);
  }, [answers, allAnswered]);

  // Team KPIs
  const totalStaff = team.length;
  const clearedCount = team.filter(t => t.clearedForWork).length;
  const pendingCount = team.filter(t => t.checklistStatus === 'pending').length;
  const notClearedCount = team.filter(t => t.checklistStatus === 'completed' && !t.clearedForWork).length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck className="h-7 w-7 text-green-400" />
            <h1 className="text-3xl font-bold text-slate-50">HSE Compliance</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">Health, Safety & Environment daily compliance tracking</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">Today</p>
          <p className="text-sm font-medium text-slate-200">{today}</p>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex border-b border-slate-700 mb-6 gap-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'checklist'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ClipboardCheck className="h-4 w-4" /> Daily Checklist
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'team'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" /> Team Compliance
          </button>
        )}
        <button
          onClick={() => setActiveTab('ppe')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'ppe'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardHat className="h-4 w-4" /> PPE Compliance
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB: Daily Checklist                                          */}
      {/* ============================================================ */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          {loadingChecklist ? (
            <LoadingSpinner size="lg" className="py-20" label="Loading checklist..." />
          ) : (
            <>
              {/* Clearance Badge */}
              {todaySubmitted && todayClearedForWork !== null && (
                <div className={`rounded-xl p-4 flex items-center gap-4 border ${
                  todayClearedForWork
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}>
                  {todayClearedForWork ? (
                    <>
                      <div className="p-3 bg-green-500/10 rounded-full">
                        <CheckCircle className="h-8 w-8 text-green-400" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-400">CLEARED FOR WORK</p>
                        <p className="text-sm text-slate-400">Your daily health & safety checklist has been approved</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-red-500/10 rounded-full">
                        <XCircle className="h-8 w-8 text-red-400" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-red-400">NOT CLEARED — Please contact supervisor</p>
                        <p className="text-sm text-slate-400">One or more critical safety requirements were not met</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Checklist Form */}
              <div className="card">
                <h2 className="text-lg font-semibold text-slate-50 mb-4 flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-blue-400" /> Daily Health & Safety Declaration
                </h2>
                <div className="space-y-3">
                  {CHECKLIST_QUESTIONS.map((q, idx) => (
                    <div
                      key={q.id}
                      className={`flex items-center justify-between gap-4 p-3 rounded-lg border transition-colors ${
                        answers[q.id] === null || answers[q.id] === undefined
                          ? 'border-slate-700 bg-slate-800/50'
                          : answers[q.id] === true
                            ? INVERTED_QUESTIONS.has(q.id)
                              ? 'border-red-500/20 bg-red-500/5'
                              : 'border-green-500/20 bg-green-500/5'
                            : INVERTED_QUESTIONS.has(q.id)
                              ? 'border-green-500/20 bg-green-500/5'
                              : q.criticality === 'block'
                                ? 'border-red-500/20 bg-red-500/5'
                                : 'border-yellow-500/20 bg-yellow-500/5'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-xs text-slate-500 font-mono mt-0.5 flex-shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                        <p className="text-sm text-slate-200">{q.text}</p>
                      </div>
                      <ToggleSwitch
                        value={answers[q.id] ?? null}
                        onChange={(v) => handleAnswerChange(q.id, v)}
                        disabled={todaySubmitted}
                      />
                    </div>
                  ))}
                </div>

                {!todaySubmitted && (
                  <button
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitting}
                    className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" /> Submit Daily Declaration
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Submission History */}
              <div className="card">
                <button
                  onClick={() => setHistoryExpanded(!historyExpanded)}
                  className="w-full flex items-center justify-between"
                >
                  <h2 className="text-lg font-semibold text-slate-50 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-400" /> Submission History
                  </h2>
                  {historyExpanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                </button>

                {historyExpanded && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-2 px-3 text-slate-400 font-medium">Date</th>
                          <th className="text-left py-2 px-3 text-slate-400 font-medium">Time</th>
                          <th className="text-left py-2 px-3 text-slate-400 font-medium">Status</th>
                          <th className="text-left py-2 px-3 text-slate-400 font-medium">Answers</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((entry) => {
                          const dt = new Date(entry.submittedAt);
                          const yesCount = Object.values(entry.answers).filter(Boolean).length;
                          const total = Object.keys(entry.answers).length;
                          return (
                            <tr key={entry.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                              <td className="py-2 px-3 text-slate-300">
                                {dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="py-2 px-3 text-slate-400">
                                {dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-2 px-3">
                                {entry.clearedForWork ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                                    <CheckCircle className="h-3 w-3" /> Cleared
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                                    <XCircle className="h-3 w-3" /> Not Cleared
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-400 font-mono text-xs">
                                {yesCount}/{total} YES
                              </td>
                            </tr>
                          );
                        })}
                        {history.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-500">No previous submissions</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: Team Compliance (admin only)                             */}
      {/* ============================================================ */}
      {activeTab === 'team' && isAdmin && (
        <div className="space-y-6">
          {loadingTeam ? (
            <LoadingSpinner size="lg" className="py-20" label="Loading team data..." />
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card text-center">
                  <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-slate-50">{totalStaff}</p>
                  <p className="text-xs text-slate-400 mt-1">Total Staff</p>
                </div>
                <div className="card text-center">
                  <CheckCircle className="h-6 w-6 text-green-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-green-400">{clearedCount}</p>
                  <p className="text-xs text-slate-400 mt-1">Cleared</p>
                </div>
                <div className="card text-center">
                  <Clock className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-yellow-400">{pendingCount}</p>
                  <p className="text-xs text-slate-400 mt-1">Pending</p>
                </div>
                <div className="card text-center">
                  <XCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-red-400">{notClearedCount}</p>
                  <p className="text-xs text-slate-400 mt-1">Not Cleared</p>
                </div>
              </div>

              {/* Team Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {team.map((member) => (
                  <div
                    key={member.id}
                    className={`card !p-4 border-l-4 ${
                      member.checklistStatus === 'pending'
                        ? 'border-l-yellow-500'
                        : member.clearedForWork
                          ? 'border-l-green-500'
                          : 'border-l-red-500'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-slate-200">{member.name}</p>
                        <p className="text-xs text-slate-400">{member.role}</p>
                      </div>
                      <UserCheck className={`h-5 w-5 ${
                        member.checklistStatus === 'pending'
                          ? 'text-yellow-400'
                          : member.clearedForWork
                            ? 'text-green-400'
                            : 'text-red-400'
                      }`} />
                    </div>
                    <div className="space-y-1.5 mt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Checklist</span>
                        {member.checklistStatus === 'completed' ? (
                          <span className="text-green-400 font-medium">Completed</span>
                        ) : member.checklistStatus === 'failed' ? (
                          <span className="text-red-400 font-medium">Failed</span>
                        ) : (
                          <span className="text-yellow-400 font-medium">Pending</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">PPE</span>
                        {member.ppeStatus === 'pass' ? (
                          <span className="text-green-400 font-medium">Pass</span>
                        ) : member.ppeStatus === 'partial' ? (
                          <span className="text-yellow-400 font-medium">Partial</span>
                        ) : member.ppeStatus === 'fail' ? (
                          <span className="text-red-400 font-medium">Fail</span>
                        ) : (
                          <span className="text-slate-500 font-medium">Pending</span>
                        )}
                      </div>
                      {member.submittedAt && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                          <Clock className="h-3 w-3" />
                          {new Date(member.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Team Table */}
              <div className="card overflow-x-auto">
                <h2 className="text-lg font-semibold text-slate-50 mb-4">Detailed View</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 px-3 text-slate-400 font-medium">Name</th>
                      <th className="text-left py-2 px-3 text-slate-400 font-medium">Role</th>
                      <th className="text-left py-2 px-3 text-slate-400 font-medium">Checklist</th>
                      <th className="text-left py-2 px-3 text-slate-400 font-medium">PPE</th>
                      <th className="text-left py-2 px-3 text-slate-400 font-medium">Cleared</th>
                      <th className="text-left py-2 px-3 text-slate-400 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((member) => (
                      <tr key={member.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="py-2 px-3 text-slate-200 font-medium">{member.name}</td>
                        <td className="py-2 px-3 text-slate-400">{member.role}</td>
                        <td className="py-2 px-3">
                          {member.checklistStatus === 'completed' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                              <CheckCircle className="h-3 w-3" /> Done
                            </span>
                          ) : member.checklistStatus === 'failed' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                              <XCircle className="h-3 w-3" /> Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {member.ppeStatus === 'pass' ? (
                            <span className="text-xs text-green-400">✅ Pass</span>
                          ) : member.ppeStatus === 'partial' ? (
                            <span className="text-xs text-yellow-400">⚠️ Partial</span>
                          ) : member.ppeStatus === 'fail' ? (
                            <span className="text-xs text-red-400">❌ Fail</span>
                          ) : (
                            <span className="text-xs text-slate-500">— Pending</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {member.checklistStatus === 'completed' ? (
                            member.clearedForWork ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-xs">
                          {member.submittedAt
                            ? new Date(member.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: PPE Compliance                                           */}
      {/* ============================================================ */}
      {activeTab === 'ppe' && (
        <div className="space-y-6">
          {loadingPpe ? (
            <LoadingSpinner size="lg" className="py-20" label="Loading PPE data..." />
          ) : ppeChecks.length === 0 ? (
            <div className="card text-center py-12">
              <HardHat className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No PPE check results available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {ppeChecks.map((check) => {
                const allPassed = check.items.every(i => i.passed);
                return (
                  <div
                    key={check.id}
                    className={`card border-l-4 ${
                      allPassed ? 'border-l-green-500' : 'border-l-yellow-500'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-slate-200">{check.technicianName}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {new Date(check.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        check.complianceScore === 100
                          ? 'bg-green-500/10 text-green-400'
                          : check.complianceScore >= 80
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-red-500/10 text-red-400'
                      }`}>
                        {check.complianceScore}%
                      </div>
                    </div>

                    {/* PPE Items Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
                      {check.items.map((item, idx) => (
                        <PPEItemDisplay key={idx} item={item.item} passed={item.passed} />
                      ))}
                    </div>

                    {/* Photo placeholder */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 border-t border-slate-700 pt-2 mt-2">
                      <Camera className="h-3.5 w-3.5" />
                      <span>Photo captured via mobile OCR</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
