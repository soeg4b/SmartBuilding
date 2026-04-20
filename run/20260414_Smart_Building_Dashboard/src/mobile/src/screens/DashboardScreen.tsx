import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, type UserRole } from '../lib/auth';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import KpiCard from '../components/KpiCard';
import type { DashboardStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<DashboardStackParamList, 'DashboardMain'>;

interface DashboardData {
  energyConsumptionKwh?: number;
  energyCostIdr?: number;
  energyTrend?: number;
  activeSensors?: number;
  totalSensors?: number;
  activeAlerts?: number;
  criticalAlerts?: number;
  equipmentHealthy?: number;
  totalEquipment?: number;
  zonesNormal?: number;
  totalZones?: number;
  pue?: number;
  savingsPercent?: number;
}

const ROLE_ENDPOINT: Record<UserRole, string> = {
  financial_decision_maker: '/dashboard/executive',
  sys_admin: '/dashboard/operations',
  technician: '/dashboard/technician',
};

const ROLE_TITLE: Record<UserRole, string> = {
  financial_decision_maker: 'Executive Dashboard',
  sys_admin: 'Operations Dashboard',
  technician: 'Technician Dashboard',
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!user) return;
    try {
      const endpoint = ROLE_ENDPOINT[user.role];
      const res = await api.get<{ data: DashboardData }>(endpoint);
      setData((res as { data: DashboardData }).data);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const socket = getSocket();
    const handleReading = () => {
      // Refresh on new sensor data (debounced by ignoring rapid fires here)
    };
    const handleAlert = () => {
      fetchDashboard();
    };
    socket.on('sensor:reading', handleReading);
    socket.on('alert:new', handleAlert);
    return () => {
      socket.off('sensor:reading', handleReading);
      socket.off('alert:new', handleAlert);
    };
  }, [fetchDashboard]);

  const onRefresh = useCallback(async () => {
    setLoading(true);
    await fetchDashboard();
  }, [fetchDashboard]);

  const role = user?.role ?? 'technician';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.name ?? 'User'}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {role === 'financial_decision_maker'
              ? 'Executive'
              : role === 'sys_admin'
                ? 'Admin'
                : 'Technician'}
          </Text>
        </View>
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

        <Text style={styles.sectionTitle}>{ROLE_TITLE[role]}</Text>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <KpiCard
            title="Energy Usage"
            value={data?.energyConsumptionKwh?.toLocaleString() ?? '—'}
            unit="kWh"
            icon="flash"
            iconColor="#eab308"
            trend={data?.energyTrend !== undefined ? { value: data.energyTrend, label: 'vs last month' } : undefined}
          />
          <KpiCard
            title="Active Alerts"
            value={data?.activeAlerts ?? '—'}
            icon="notifications"
            iconColor={data?.criticalAlerts ? '#ef4444' : '#3b82f6'}
          />
        </View>

        <View style={styles.kpiGrid}>
          <KpiCard
            title="Equipment"
            value={
              data?.totalEquipment
                ? `${data.equipmentHealthy ?? 0}/${data.totalEquipment}`
                : '—'
            }
            unit="healthy"
            icon="hardware-chip"
            iconColor="#22c55e"
          />
          <KpiCard
            title="Sensors"
            value={
              data?.totalSensors
                ? `${data.activeSensors ?? 0}/${data.totalSensors}`
                : '—'
            }
            unit="online"
            icon="radio"
            iconColor="#06b6d4"
          />
        </View>

        {role === 'financial_decision_maker' && (
          <View style={styles.kpiGrid}>
            <KpiCard
              title="Energy Cost"
              value={
                data?.energyCostIdr
                  ? `Rp ${(data.energyCostIdr / 1_000_000).toFixed(1)}M`
                  : '—'
              }
              icon="cash"
              iconColor="#22c55e"
            />
            <KpiCard
              title="PUE"
              value={data?.pue?.toFixed(2) ?? '—'}
              icon="speedometer"
              iconColor="#8b5cf6"
            />
          </View>
        )}

        {role === 'sys_admin' && (
          <View style={styles.kpiGrid}>
            <KpiCard
              title="Zones OK"
              value={
                data?.totalZones
                  ? `${data.zonesNormal ?? 0}/${data.totalZones}`
                  : '—'
              }
              icon="grid"
              iconColor="#22c55e"
            />
            <KpiCard
              title="Savings"
              value={data?.savingsPercent?.toFixed(1) ?? '—'}
              unit="%"
              icon="trending-down"
              iconColor="#22c55e"
            />
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Environment')}
          >
            <Ionicons name="thermometer" size={24} color="#f97316" />
            <Text style={styles.actionLabel}>Environment</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 14,
    color: '#94a3b8',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
  },
  roleBadge: {
    backgroundColor: '#3b82f620',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f8fafc',
    marginTop: 16,
    marginBottom: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  actionLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
