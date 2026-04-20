import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import KpiCard from '../components/KpiCard';

interface EnergyData {
  totalConsumptionKwh: number;
  peakLoadKw: number;
  avgPowerFactor: number;
  costIdr: number;
  trend: number;
}

interface TrendPoint {
  timestamp: string;
  kwh: number;
}

const BAR_COUNT = 12;
const CHART_HEIGHT = 140;

export default function EnergyScreen() {
  const [data, setData] = useState<EnergyData | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [consumptionRes, trendRes] = await Promise.all([
        api.get<{ data: EnergyData }>('/energy/consumption'),
        api.get<{ data: TrendPoint[] }>('/energy/trends', { period: 'daily', limit: BAR_COUNT }),
      ]);
      setData((consumptionRes as { data: EnergyData }).data);
      const trendData = (trendRes as { data: TrendPoint[] }).data;
      setTrend(Array.isArray(trendData) ? trendData : []);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setLoading(true);
    await fetchData();
  }, [fetchData]);

  const maxKwh = trend.length > 0 ? Math.max(...trend.map((t) => t.kwh), 1) : 1;
  const barWidth = (Dimensions.get('window').width - 80) / BAR_COUNT - 4;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.pageTitle}>Energy Monitoring</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        {offline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={16} color="#eab308" />
            <Text style={styles.offlineText}>Offline — showing cached data</Text>
          </View>
        )}

        {/* KPIs */}
        <View style={styles.kpiGrid}>
          <KpiCard
            title="Consumption"
            value={data?.totalConsumptionKwh?.toLocaleString() ?? '—'}
            unit="kWh"
            icon="flash"
            iconColor="#eab308"
            trend={data?.trend !== undefined ? { value: data.trend, label: 'vs last period' } : undefined}
          />
          <KpiCard
            title="Peak Load"
            value={data?.peakLoadKw?.toFixed(1) ?? '—'}
            unit="kW"
            icon="trending-up"
            iconColor="#ef4444"
          />
        </View>

        <View style={styles.kpiGrid}>
          <KpiCard
            title="Power Factor"
            value={data?.avgPowerFactor?.toFixed(2) ?? '—'}
            icon="speedometer"
            iconColor="#8b5cf6"
          />
          <KpiCard
            title="Est. Cost"
            value={
              data?.costIdr
                ? `Rp ${(data.costIdr / 1_000_000).toFixed(1)}M`
                : '—'
            }
            icon="cash"
            iconColor="#22c55e"
          />
        </View>

        {/* Simple Bar Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Daily Consumption Trend</Text>
          <View style={styles.chart}>
            {trend.slice(-BAR_COUNT).map((point, idx) => {
              const height = (point.kwh / maxKwh) * CHART_HEIGHT;
              const date = new Date(point.timestamp);
              const label = `${date.getDate()}`;
              return (
                <View key={idx} style={styles.barGroup}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(height, 4),
                        width: barWidth,
                        backgroundColor: point.kwh / maxKwh > 0.8 ? '#ef4444' : '#3b82f6',
                      },
                    ]}
                  />
                  <Text style={styles.barLabel}>{label}</Text>
                </View>
              );
            })}
          </View>
          {trend.length === 0 && !loading && (
            <Text style={styles.emptyChart}>No trend data available</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eab30815',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  offlineText: {
    fontSize: 13,
    color: '#eab308',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  chartCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    marginTop: 10,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: CHART_HEIGHT + 24,
    paddingTop: 4,
  },
  barGroup: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  bar: {
    borderRadius: 3,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  emptyChart: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
    paddingVertical: 30,
  },
});
