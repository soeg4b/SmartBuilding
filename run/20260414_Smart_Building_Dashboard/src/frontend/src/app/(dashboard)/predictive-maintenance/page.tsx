'use client';

import ModulePage, { PlaceholderCard } from '@/components/dashboard/ModulePage';

export default function PredictiveMaintenancePage() {
  return (
    <ModulePage
      title="Predictive Maintenance (CME)"
      subtitle="Algoritma ML mendeteksi anomali pada chiller, transformer, dan aset kritikal lainnya"
      kpis={[
        { label: 'Active Anomalies', value: '3', delta: '2 critical', tone: 'amber' },
        { label: 'Predicted Failures (30d)', value: '7', delta: 'avoided', tone: 'green' },
        { label: 'Vibration Sensors', value: '128', delta: 'all online', tone: 'cyan' },
        { label: 'Model Accuracy', value: '92.4%', delta: '+1.8%', tone: 'green' },
      ]}
    >
      <div className="grid lg:grid-cols-2 gap-4">
        <PlaceholderCard title="Anomaly Timeline" description="Vibration, current draw, and temperature anomaly stream." />
        <PlaceholderCard title="Risk-Ranked Assets" description="Top 10 assets by failure probability + recommended action." />
      </div>
    </ModulePage>
  );
}
