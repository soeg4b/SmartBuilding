import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

interface TenantSummary {
  company: string | null;
  floorId: string | null;
  bookingsToday: number;
  openTickets: number;
  accessPasses: number;
  parkingSlot: string;
}

interface GuestStay {
  roomNumber: string;
  checkIn: string | null;
  checkOut: string | null;
  mobileKey: { active: boolean; doors: string[] };
  bill: { current: number; currency: string };
}

export default function TenantHomeScreen() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<TenantSummary | null>(null);
  const [stay, setStay] = useState<GuestStay | null>(null);

  useEffect(() => {
    if (user?.role === 'tenant') {
      api.get<{ data: TenantSummary }>('/tenant/me/summary').then((r) => setSummary(r.data)).catch(() => {});
    }
    if (user?.role === 'guest') {
      api.get<{ data: GuestStay }>('/guest/me/stay').then((r) => setStay(r.data)).catch(() => {});
    }
  }, [user?.role]);

  const isGuest = user?.role === 'guest';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.greeting}>Welcome, {user?.name?.split(' ')[1] ?? user?.name}</Text>
        <Text style={styles.sub}>
          {isGuest
            ? `Room ${stay?.roomNumber ?? '—'} · ${stay?.checkIn ?? ''} → ${stay?.checkOut ?? ''}`
            : `${summary?.company ?? user?.tenantCompany ?? 'Tenant'} · Floor ${summary?.floorId?.toUpperCase() ?? '—'}`}
        </Text>

        <View style={styles.statRow}>
          {isGuest ? (
            <>
              <Stat label="Mobile Key" value={stay?.mobileKey.active ? 'Active' : 'Off'} />
              <Stat label="Doors" value={`${stay?.mobileKey.doors.length ?? 0}`} />
              <Stat label="Folio" value={`$${stay?.bill.current.toFixed(0) ?? '0'}`} />
            </>
          ) : (
            <>
              <Stat label="Bookings" value={`${summary?.bookingsToday ?? 0}`} />
              <Stat label="Tickets" value={`${summary?.openTickets ?? 0}`} />
              <Stat label="Parking" value={summary?.parkingSlot ?? '—'} />
            </>
          )}
        </View>

        <Text style={styles.section}>Quick Actions</Text>
        <View style={styles.grid}>
          <Action icon="key" label="Mobile Key" onPress={() => Alert.alert('Mobile Key', 'Open the Mobile Key tab to unlock doors.')} />
          {!isGuest && <Action icon="calendar" label="Book Room" onPress={() => Alert.alert('Booking', 'Available in next release.')} />}
          <Action icon="ticket" label="Helpdesk" onPress={() => Alert.alert('Helpdesk', 'Ticket flow opened.')} />
          {!isGuest && <Action icon="car" label="Parking" onPress={() => Alert.alert('Parking', summary?.parkingSlot ?? '—')} />}
          {isGuest && <Action icon="restaurant" label="Room Service" onPress={() => Alert.alert('Service', 'Order placed.')} />}
          {isGuest && <Action icon="sparkles" label="Housekeeping" onPress={() => Alert.alert('Housekeeping', 'Requested.')} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress}>
      <Ionicons name={icon} size={22} color="#22d3ee" />
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 16 },
  greeting: { fontSize: 24, fontWeight: '700', color: '#f8fafc' },
  sub: { fontSize: 13, color: '#94a3b8', marginTop: 4, marginBottom: 16 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  stat: { flex: 1, backgroundColor: '#1e293b', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#334155' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#22d3ee' },
  statLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  section: { fontSize: 12, fontWeight: '700', color: '#22d3ee', letterSpacing: 1, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { width: '48%', backgroundColor: '#1e293b', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#334155' },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#f8fafc', marginTop: 8 },
});
