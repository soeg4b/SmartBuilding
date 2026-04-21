import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const palette = darkMode
    ? {
        pageBg: '#0f172a',
        cardBg: '#1e293b',
        border: '#334155',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
      }
    : {
        pageBg: '#f8fafc',
        cardBg: '#ffffff',
        border: '#cbd5e1',
        textPrimary: '#0f172a',
        textSecondary: '#334155',
        textMuted: '#64748b',
      };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const shouldSignOut =
        typeof window !== 'undefined'
          ? window.confirm('Are you sure you want to sign out?')
          : true;
      if (shouldSignOut) {
        await logout();
      }
      return;
    }

    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleAccountPress = () => {
    Alert.alert(
      'Account',
      `Name: ${user?.name ?? '-'}\nEmail: ${user?.email ?? '-'}\nRole: ${roleLabel}`,
    );
  };

  const handleNotificationPress = () => {
    setNotificationsEnabled((prev) => !prev);
    Alert.alert(
      'Notification Preferences',
      notificationsEnabled ? 'Push notifications disabled.' : 'Push notifications enabled.',
    );
  };

  const handleDarkModePress = () => {
    setDarkMode((prev) => !prev);
  };

  const handleAboutPress = () => {
    Alert.alert('About', 'Smart Building Dashboard\nVersion 1.0.0');
  };

  const roleLabel =
    user?.role === 'financial_decision_maker'
      ? 'Executive / Financial Decision Maker'
      : user?.role === 'sys_admin'
        ? 'System Administrator'
        : 'Technician';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.pageBg }]} edges={['top']}>
      <Text style={[styles.pageTitle, { color: palette.textPrimary }]}>Settings</Text>

      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <View style={[styles.avatar, darkMode ? null : styles.avatarLight]}>
          <Text style={styles.avatarText}>
            {user?.name
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() ?? '?'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: palette.textPrimary }]}>{user?.name ?? 'Unknown'}</Text>
          <Text style={[styles.profileEmail, { color: palette.textSecondary }]}>{user?.email ?? ''}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={[styles.menuSection, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <MenuItem
          icon="person-outline"
          label="Account"
          onPress={handleAccountPress}
          textColor={palette.textPrimary}
          mutedColor={palette.textMuted}
          borderColor={palette.border}
        />
        <MenuItem
          icon="notifications-outline"
          label="Notification Preferences"
          trailing={notificationsEnabled ? 'On' : 'Off'}
          onPress={handleNotificationPress}
          textColor={palette.textPrimary}
          mutedColor={palette.textMuted}
          borderColor={palette.border}
        />
        <MenuItem
          icon="moon-outline"
          label="Dark Mode"
          trailing={darkMode ? 'On' : 'Off'}
          onPress={handleDarkModePress}
          textColor={palette.textPrimary}
          mutedColor={palette.textMuted}
          borderColor={palette.border}
        />
        <MenuItem
          icon="information-circle-outline"
          label="About"
          trailing="v1.0.0"
          onPress={handleAboutPress}
          textColor={palette.textPrimary}
          mutedColor={palette.textMuted}
          borderColor={palette.border}
        />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={[styles.footer, { color: palette.textMuted }]}>Smart Building Dashboard v1.0.0</Text>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  trailing,
  onPress,
  textColor,
  mutedColor,
  borderColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  trailing?: string;
  onPress: () => void;
  textColor: string;
  mutedColor: string;
  borderColor: string;
}) {
  return (
    <TouchableOpacity style={[styles.menuItem, { borderBottomColor: borderColor }]} activeOpacity={0.6} onPress={onPress}>
      <View style={styles.menuLeft}>
        <Ionicons name={icon} size={20} color={mutedColor} />
        <Text style={[styles.menuLabel, { color: textColor }]}>{label}</Text>
      </View>
      <View style={styles.menuRight}>
        {trailing && <Text style={[styles.menuTrailing, { color: mutedColor }]}>{trailing}</Text>}
        <Ionicons name="chevron-forward" size={18} color={mutedColor} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    paddingBottom: 16,
  },
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLight: {
    backgroundColor: '#2563eb',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f8fafc',
  },
  profileEmail: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#3b82f620',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
  },
  menuSection: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLabel: {
    fontSize: 15,
    color: '#f8fafc',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  menuTrailing: {
    fontSize: 13,
    color: '#64748b',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef444415',
    borderRadius: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#ef444430',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  footer: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 12,
    marginTop: 'auto',
    paddingBottom: 20,
  },
});
