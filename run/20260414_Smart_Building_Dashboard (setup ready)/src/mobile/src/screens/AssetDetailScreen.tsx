import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import KpiCard from '../components/KpiCard';
import type { AssetsStackParamList } from '../navigation/AppNavigator';

type Route = RouteProp<AssetsStackParamList, 'AssetDetail'>;

interface EquipmentDetail {
  id: string;
  name: string;
  type: string;
  serialNumber?: string | null;
  healthStatus: 'green' | 'yellow' | 'red';
  isActive: boolean;
  location: {
    buildingName: string;
    floorName?: string | null;
    zoneName?: string | null;
  };
  sensors?: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    lastValue?: number;
    unit?: string;
  }>;
  metrics?: {
    runningHours?: number;
    cycleCount?: number;
    fuelLevel?: number;
  };
}

export default function AssetDetailScreen() {
  const route = useRoute<Route>();
  const { id, name } = route.params;

  const [detail, setDetail] = useState<EquipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await api.get<{ data: EquipmentDetail }>(`/equipment/${id}`);
      setDetail((res as { data: EquipmentDetail }).data);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const onRefresh = useCallback(async () => {
    setLoading(true);
    await fetchDetail();
  }, [fetchDetail]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.pageTitle} numberOfLines={1}>
          {name}
        </Text>
        {detail && <StatusBadge status={detail.healthStatus} size="md" />}
      </View>

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

        {detail && (
          <>
            {/* Info Card */}
            <View style={styles.infoCard}>
              <InfoRow label="Type" value={detail.type.toUpperCase()} />
              {detail.serialNumber && (
                <InfoRow label="Serial" value={detail.serialNumber} />
              )}
              <InfoRow
                label="Location"
                value={
                  [
                    detail.location.buildingName,
                    detail.location.floorName,
                    detail.location.zoneName,
                  ]
                    .filter(Boolean)
                    .join(' › ')
                }
              />
              <InfoRow label="Status" value={detail.isActive ? 'Active' : 'Inactive'} />
            </View>

            {/* Metrics */}
            {detail.metrics && (
              <>
                <Text style={styles.sectionTitle}>Metrics</Text>
                <View style={styles.kpiGrid}>
                  {detail.metrics.runningHours !== undefined && (
                    <KpiCard
                      title="Running Hours"
                      value={detail.metrics.runningHours.toLocaleString()}
                      unit="hrs"
                      icon="time"
                      iconColor="#3b82f6"
                    />
                  )}
                  {detail.metrics.cycleCount !== undefined && (
                    <KpiCard
                      title="Cycles"
                      value={detail.metrics.cycleCount.toLocaleString()}
                      icon="refresh"
                      iconColor="#8b5cf6"
                    />
                  )}
                </View>
                {detail.metrics.fuelLevel !== undefined && (
                  <View style={styles.kpiGrid}>
                    <KpiCard
                      title="Fuel Level"
                      value={detail.metrics.fuelLevel.toFixed(0)}
                      unit="%"
                      icon="speedometer"
                      iconColor={detail.metrics.fuelLevel < 20 ? '#ef4444' : '#22c55e'}
                    />
                  </View>
                )}
              </>
            )}

            {/* Linked Sensors */}
            {detail.sensors && detail.sensors.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Linked Sensors</Text>
                {detail.sensors.map((sensor) => (
                  <View key={sensor.id} style={styles.sensorRow}>
                    <View style={styles.sensorInfo}>
                      <Text style={styles.sensorName}>{sensor.name}</Text>
                      <Text style={styles.sensorType}>{sensor.type}</Text>
                    </View>
                    <View style={styles.sensorRight}>
                      {sensor.lastValue !== undefined && (
                        <Text style={styles.sensorValue}>
                          {sensor.lastValue} {sensor.unit ?? ''}
                        </Text>
                      )}
                      <StatusBadge status={sensor.status as 'online' | 'offline' | 'stale'} />
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
    marginRight: 12,
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
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    gap: 10,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  infoValue: {
    fontSize: 13,
    color: '#f8fafc',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  sensorRow: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sensorInfo: {
    flex: 1,
  },
  sensorName: {
    fontSize: 14,
    color: '#f8fafc',
    fontWeight: '500',
  },
  sensorType: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  sensorRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  sensorValue: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '600',
  },
});
