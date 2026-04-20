import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import EquipmentCard from '../components/EquipmentCard';
import type { AssetsStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<AssetsStackParamList, 'AssetsList'>;

interface Equipment {
  id: string;
  name: string;
  type: 'genset' | 'pump' | 'ahu' | 'chiller' | 'boiler' | 'elevator' | 'transformer';
  healthStatus: 'green' | 'yellow' | 'red';
  isActive: boolean;
  location: {
    buildingId: string;
    buildingName: string;
    floorName?: string | null;
    zoneName?: string | null;
  };
}

export default function AssetsScreen() {
  const navigation = useNavigation<Nav>();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [search, setSearch] = useState('');

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await api.get<{ data: Equipment[] }>('/equipment');
      const eqData = (res as { data: Equipment[] }).data;
      setEquipment(Array.isArray(eqData) ? eqData : []);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const onRefresh = useCallback(async () => {
    setLoading(true);
    await fetchEquipment();
  }, [fetchEquipment]);

  const filtered = equipment.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.type.toLowerCase().includes(search.toLowerCase()),
  );

  const healthySummary = equipment.filter((e) => e.healthStatus === 'green').length;
  const warningSummary = equipment.filter((e) => e.healthStatus === 'yellow').length;
  const criticalSummary = equipment.filter((e) => e.healthStatus === 'red').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.pageTitle}>Asset Health</Text>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.summaryText}>{healthySummary} Healthy</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.dot, { backgroundColor: '#eab308' }]} />
          <Text style={styles.summaryText}>{warningSummary} Warning</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.summaryText}>{criticalSummary} Critical</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search equipment..."
          placeholderTextColor="#475569"
        />
      </View>

      {offline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="#eab308" />
          <Text style={styles.offlineText}>Offline — showing cached data</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EquipmentCard
            id={item.id}
            name={item.name}
            type={item.type}
            healthStatus={item.healthStatus}
            location={
              [item.location.buildingName, item.location.floorName, item.location.zoneName]
                .filter(Boolean)
                .join(' › ')
            }
            onPress={(id, name) => navigation.navigate('AssetDetail', { id, name })}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              {search ? 'No matching equipment' : 'No equipment found'}
            </Text>
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#f8fafc',
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
