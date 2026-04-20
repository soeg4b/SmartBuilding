import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import ZoneCard from '../components/ZoneCard';

interface ZoneReading {
  value: number;
  unit: string;
  status: string;
  aqiLabel?: string;
}

interface ZoneEnvStatus {
  id: string;
  name: string;
  floorId: string;
  floorName: string;
  status: 'normal' | 'warning' | 'critical';
  readings: {
    temperature?: ZoneReading;
    humidity?: ZoneReading;
    co2?: ZoneReading;
  };
}

export default function EnvironmentScreen() {
  const [zones, setZones] = useState<ZoneEnvStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const fetchZones = useCallback(async () => {
    try {
      const res = await api.get<{ data: ZoneEnvStatus[] }>('/zones/environmental');
      const zoneData = (res as { data: ZoneEnvStatus[] }).data;
      setZones(Array.isArray(zoneData) ? zoneData : []);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  useEffect(() => {
    const socket = getSocket();
    const handleReading = () => {
      fetchZones();
    };
    socket.on('sensor:reading', handleReading);
    return () => {
      socket.off('sensor:reading', handleReading);
    };
  }, [fetchZones]);

  const onRefresh = useCallback(async () => {
    setLoading(true);
    await fetchZones();
  }, [fetchZones]);

  const warningCount = zones.filter((z) => z.status === 'warning').length;
  const criticalCount = zones.filter((z) => z.status === 'critical').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.pageTitle}>Environmental Quality</Text>

      {/* Summary bar */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.summaryText}>
            {zones.length - warningCount - criticalCount} Normal
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.dot, { backgroundColor: '#eab308' }]} />
          <Text style={styles.summaryText}>{warningCount} Warning</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.summaryText}>{criticalCount} Critical</Text>
        </View>
      </View>

      {offline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="#eab308" />
          <Text style={styles.offlineText}>Offline — showing cached data</Text>
        </View>
      )}

      <FlatList
        data={zones}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ZoneCard
            name={item.name}
            floorName={item.floorName}
            status={item.status}
            readings={item.readings}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>No zones found</Text>
          ) : null
        }
      />
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
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eab30815',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  offlineText: {
    fontSize: 13,
    color: '#eab308',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    marginTop: 40,
  },
});
