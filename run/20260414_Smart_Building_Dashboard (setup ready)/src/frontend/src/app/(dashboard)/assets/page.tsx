'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, Filter, Wrench } from 'lucide-react';
import { api } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Equipment {
  id: string;
  name: string;
  type: string;
  serialNumber?: string | null;
  healthStatus: 'green' | 'yellow' | 'red';
  isActive: boolean;
  location: {
    buildingId: string;
    buildingName: string;
    floorId?: string | null;
    floorName?: string | null;
    zoneId?: string | null;
    zoneName?: string | null;
  };
}

export default function AssetsPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    api.get<{ data: Equipment[] }>('/equipment')
      .then((res) => setEquipment(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const types = useMemo(() => {
    const set = new Set(equipment.map((e) => e.type));
    return Array.from(set).sort();
  }, [equipment]);

  const filtered = useMemo(() => {
    return equipment.filter((e) => {
      if (healthFilter !== 'all' && e.healthStatus !== healthFilter) return false;
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q) ||
          e.serialNumber?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [equipment, healthFilter, typeFilter, search]);

  const healthCounts = useMemo(() => ({
    green: equipment.filter((e) => e.healthStatus === 'green').length,
    yellow: equipment.filter((e) => e.healthStatus === 'yellow').length,
    red: equipment.filter((e) => e.healthStatus === 'red').length,
  }), [equipment]);

  if (loading) return <LoadingSpinner size="lg" className="py-20" label="Loading assets..." />;
  if (error) return <div className="card text-red-400 text-center py-8">{error}</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-50">Asset Health</h1>
        <p className="text-sm text-slate-400 mt-1">Monitor and manage building equipment</p>
      </div>

      {/* Health summary bar */}
      <div className="card mb-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-sm text-slate-300">Healthy: {healthCounts.green}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-sm text-slate-300">Warning: {healthCounts.yellow}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-sm text-slate-300">Critical: {healthCounts.red}</span>
          </div>
          <div className="flex-1" />
          <span className="text-sm text-slate-400">Total: {equipment.length}</span>
        </div>
        {/* Stacked bar */}
        <div className="flex h-2 rounded-full overflow-hidden mt-3 bg-slate-700">
          {healthCounts.green > 0 && (
            <div className="bg-green-500 h-full" style={{ width: `${(healthCounts.green / equipment.length) * 100}%` }} />
          )}
          {healthCounts.yellow > 0 && (
            <div className="bg-yellow-500 h-full" style={{ width: `${(healthCounts.yellow / equipment.length) * 100}%` }} />
          )}
          {healthCounts.red > 0 && (
            <div className="bg-red-500 h-full" style={{ width: `${(healthCounts.red / equipment.length) * 100}%` }} />
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
            placeholder="Search equipment..."
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">All Status</option>
            <option value="green">Healthy</option>
            <option value="yellow">Warning</option>
            <option value="red">Critical</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">All Types</option>
            {types.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Equipment grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full card text-center py-8">
            <Wrench className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No equipment matches your filters</p>
          </div>
        ) : (
          filtered.map((eq) => (
            <Link key={eq.id} href={`/assets/${eq.id}`} className="card hover:border-slate-600 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                    {eq.name}
                  </h3>
                  <p className="text-[10px] text-slate-500 capitalize">{eq.type.replace(/_/g, ' ')}</p>
                </div>
                <StatusBadge variant={eq.healthStatus} dot />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{eq.location.floorName ?? eq.location.buildingName}</span>
                {eq.serialNumber && <span className="font-mono text-[10px]">{eq.serialNumber}</span>}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
