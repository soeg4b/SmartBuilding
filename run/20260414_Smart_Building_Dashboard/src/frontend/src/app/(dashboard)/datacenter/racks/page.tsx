'use client';

import ModulePage, { PlaceholderCard } from '@/components/dashboard/ModulePage';

export default function RacksPage() {
  return (
    <ModulePage
      title="Rack & Power Monitoring"
      subtitle="Rack-level power, density, dan temperature untuk fasilitas data center"
      badge="Data Center"
      kpis={[
        { label: 'Total Racks', value: '124', delta: '8 hot', tone: 'amber' },
        { label: 'Total Load', value: '486 kW', delta: '72% capacity', tone: 'cyan' },
        { label: 'Power Density', value: '6.2 kW/rack', delta: 'avg', tone: 'blue' },
        { label: 'PDU Health', value: '100%', delta: 'all online', tone: 'green' },
      ]}
    >
      <div className="grid lg:grid-cols-2 gap-4">
        <PlaceholderCard title="Rack Heat Map" description="Hot/cold aisle temperature distribution per rack." />
        <PlaceholderCard title="Power Trend" description="Per-PDU draw with redundancy failover events." />
      </div>
    </ModulePage>
  );
}
