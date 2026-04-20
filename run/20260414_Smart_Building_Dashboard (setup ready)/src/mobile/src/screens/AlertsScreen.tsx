import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import AlertItem from '../components/AlertItem';

type AlertSeverity = 'info' | 'warning' | 'critical';
type AlertStatus = 'active' | 'acknowledged' | 'resolved';

interface AlertData {
  id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  triggeredAt: string;
}

type FilterStatus = 'all' | 'active' | 'acknowledged' | 'resolved';

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'acknowledged', label: 'Ack' },
  { key: 'resolved', label: 'Resolved' },
];

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');

  const fetchAlerts = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filter !== 'all') params.status = filter;
      const res = await api.get<{ data: AlertData[] }>('/alerts', params);
      const alertData = (res as { data: AlertData[] }).data;
      setAlerts(Array.isArray(alertData) ? alertData : []);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    const socket = getSocket();
    const handleNewAlert = (event: { alert: AlertData }) => {
      setAlerts((prev) => [event.alert, ...prev]);
    };
    socket.on('alert:new', handleNewAlert);
    return () => {
      socket.off('alert:new', handleNewAlert);
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setLoading(true);
    await fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = useCallback(
    async (id: string) => {
      try {
        await api.patch(`/alerts/${id}/acknowledge`, { notes: 'Acknowledged from mobile' });
        await fetchAlerts();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed';
        Alert.alert('Error', message);
      }
    },
    [fetchAlerts],
  );

  const handleResolve = useCallback(
    async (id: string) => {
      try {
        await api.patch(`/alerts/${id}/resolve`, { notes: 'Resolved from mobile' });
        await fetchAlerts();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed';
        Alert.alert('Error', message);
      }
    },
    [fetchAlerts],
  );

  const activeCount = alerts.filter((a) => a.status === 'active').length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical' && a.status === 'active').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Alerts</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {activeCount} active{criticalCount > 0 ? ` (${criticalCount} critical)` : ''}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {offline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="#eab308" />
          <Text style={styles.offlineText}>Offline — showing cached data</Text>
        </View>
      )}

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlertItem
            id={item.id}
            severity={item.severity}
            status={item.status}
            message={item.message}
            triggeredAt={item.triggeredAt}
            onAcknowledge={handleAcknowledge}
            onResolve={handleResolve}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
              <Text style={styles.emptyTitle}>All Clear</Text>
              <Text style={styles.emptyText}>No alerts to show</Text>
            </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
  },
  countBadge: {
    backgroundColor: '#ef444420',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterBtnActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
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
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
});
