'use client';

import ModulePage, { PlaceholderCard } from '@/components/dashboard/ModulePage';

export default function EsgPage() {
  return (
    <ModulePage
      title="ESG & Sustainability"
      subtitle="Carbon footprint, water usage, dan energy intensity index untuk kepatuhan regulasi & nilai aset"
      badge="ESG"
      kpis={[
        { label: 'Carbon Footprint', value: '128 t', delta: '-12% YoY', tone: 'green' },
        { label: 'Water Usage', value: '14.2 ML', delta: '-8%', tone: 'cyan' },
        { label: 'Energy Intensity', value: '142 kWh/m²', delta: '-15%', tone: 'green' },
        { label: 'Renewable Mix', value: '34%', delta: '+9 pts', tone: 'green' },
      ]}
    >
      <div className="grid lg:grid-cols-2 gap-4">
        <PlaceholderCard title="Scope 1/2/3 Emissions Trend" description="12-month rolling emissions broken down by scope and energy source." />
        <PlaceholderCard title="Sustainability Compliance" description="GRESB, ISO 14001, and local regulator alignment status." />
      </div>
    </ModulePage>
  );
}
