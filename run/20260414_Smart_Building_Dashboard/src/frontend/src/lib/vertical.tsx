'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type BuildingVertical = 'data_center' | 'office' | 'hospitality';

export interface VerticalDefinition {
  id: BuildingVertical;
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
}

export const VERTICALS: VerticalDefinition[] = [
  {
    id: 'data_center',
    label: 'Data Center Building Management',
    shortLabel: 'Data Center',
    description: 'Mission-critical PUE, cooling, rack power, biometric access',
    accent: 'from-blue-600 to-cyan-500',
  },
  {
    id: 'office',
    label: 'Office Building Management',
    shortLabel: 'Office',
    description: 'Tenant experience, booking, HVAC, parking, helpdesk',
    accent: 'from-emerald-600 to-teal-500',
  },
  {
    id: 'hospitality',
    label: 'Hospitality Management (Hotel & Apartment)',
    shortLabel: 'Hospitality',
    description: 'Guest journey, mobile key, housekeeping, F&B integration',
    accent: 'from-amber-500 to-rose-500',
  },
];

const STORAGE_KEY = 'integra.vertical';

interface VerticalCtx {
  vertical: BuildingVertical;
  setVertical: (v: BuildingVertical) => void;
  definition: VerticalDefinition;
}

const VerticalContext = createContext<VerticalCtx | null>(null);

export function VerticalProvider({ children }: { children: ReactNode }) {
  const [vertical, setVerticalState] = useState<BuildingVertical>('office');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved && VERTICALS.some((v) => v.id === saved)) {
      setVerticalState(saved as BuildingVertical);
      return;
    }
    // Allow override via ?vertical= query string from landing page
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get('vertical');
      if (fromQuery && VERTICALS.some((v) => v.id === fromQuery)) {
        setVerticalState(fromQuery as BuildingVertical);
        window.localStorage.setItem(STORAGE_KEY, fromQuery);
      }
    }
  }, []);

  const setVertical = (v: BuildingVertical) => {
    setVerticalState(v);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, v);
  };

  const definition = VERTICALS.find((v) => v.id === vertical) ?? VERTICALS[1];

  return (
    <VerticalContext.Provider value={{ vertical, setVertical, definition }}>
      {children}
    </VerticalContext.Provider>
  );
}

export function useVertical(): VerticalCtx {
  const ctx = useContext(VerticalContext);
  if (!ctx) throw new Error('useVertical must be used inside VerticalProvider');
  return ctx;
}
