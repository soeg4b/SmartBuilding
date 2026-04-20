import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export default function MobileKeyScreen() {
  const { user } = useAuth();
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const doors = user?.role === 'guest'
    ? ['Room', 'Gym', 'Pool', 'Lift']
    : ['Office 3A', 'Lift Lobby', 'Server Room', 'Parking Gate'];

  const handleUnlock = async (label: string) => {
    const doorId = `door-${label.toLowerCase().replace(/\s+/g, '-')}`;
    setUnlocking(doorId);
    try {
      await api.post('/iam/unlock', { doorId, method: 'mobile_key' });
      Alert.alert('Unlocked', `✓ ${label} unlocked successfully`);
    } catch {
      Alert.alert('Failed', 'Unlock failed. Please retry.');
    } finally {
      setUnlocking(null);
    }
  };

  const handleEnroll = async () => {
    try {
      await api.post('/iam/biometric/enroll', { factor: 'fingerprint' });
      Alert.alert('Biometric', '✓ Enrolled successfully');
    } catch {
      Alert.alert('Failed', 'Biometric enrollment failed.');
    }
  };

  const handleMfa = async () => {
    try {
      await api.post('/iam/mfa/enable', { method: 'totp' });
      Alert.alert('MFA', '✓ MFA enabled');
    } catch {
      Alert.alert('Failed', 'MFA setup failed.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Mobile Key</Text>
        <Text style={styles.sub}>Tap a door to unlock with your encrypted credential</Text>

        <View style={styles.statusRow}>
          <Status label="Key" on />
          <Status label="MFA" on={!!user?.mfaEnabled} />
          <Status label="Biometric" on={!!user?.biometricEnrolled} />
        </View>

        {doors.map((label) => {
          const doorId = `door-${label.toLowerCase().replace(/\s+/g, '-')}`;
          const isLoading = unlocking === doorId;
          return (
            <TouchableOpacity
              key={doorId}
              style={[styles.door, isLoading && styles.doorLoading]}
              onPress={() => handleUnlock(label)}
              disabled={isLoading}
            >
              <Ionicons name="key" size={20} color="#22d3ee" />
              <Text style={styles.doorLabel}>{label}</Text>
              {isLoading ? <ActivityIndicator color="#22d3ee" /> : <Text style={styles.doorAction}>Tap →</Text>}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.section}>Security Settings</Text>
        <TouchableOpacity style={styles.btn} onPress={handleEnroll}>
          <Ionicons name="finger-print" size={18} color="#fff" />
          <Text style={styles.btnText}>Enroll Biometric</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handleMfa}>
          <Ionicons name="shield-checkmark" size={18} color="#fff" />
          <Text style={styles.btnText}>Enable MFA</Text>
        </TouchableOpacity>

        <Text style={styles.note}>End-to-end encrypted. Only your device holds the unlock key.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Status({ label, on }: { label: string; on: boolean }) {
  return (
    <View style={styles.statusItem}>
      <View style={[styles.dot, { backgroundColor: on ? '#10b981' : '#f59e0b' }]} />
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#f8fafc' },
  sub: { fontSize: 13, color: '#94a3b8', marginTop: 4, marginBottom: 16 },
  statusRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, color: '#cbd5e1' },
  door: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e293b', borderRadius: 8, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#334155',
  },
  doorLoading: { opacity: 0.7 },
  doorLabel: { flex: 1, fontSize: 15, color: '#f8fafc', fontWeight: '500' },
  doorAction: { fontSize: 12, color: '#22d3ee', fontWeight: '700' },
  section: { fontSize: 12, fontWeight: '700', color: '#22d3ee', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  btn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0ea5e9', borderRadius: 8, padding: 14, marginBottom: 8 },
  btnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  note: { fontSize: 11, color: '#64748b', marginTop: 16, textAlign: 'center' },
});
