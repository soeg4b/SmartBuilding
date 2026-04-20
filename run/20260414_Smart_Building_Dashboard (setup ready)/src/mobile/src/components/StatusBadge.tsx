import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type StatusType = 'green' | 'yellow' | 'red' | 'normal' | 'warning' | 'critical' |
  'active' | 'acknowledged' | 'resolved' | 'online' | 'offline' | 'stale' | 'info';

const STATUS_COLORS: Record<string, string> = {
  green: '#22c55e',
  normal: '#22c55e',
  online: '#22c55e',
  resolved: '#22c55e',
  yellow: '#eab308',
  warning: '#eab308',
  stale: '#eab308',
  acknowledged: '#eab308',
  red: '#ef4444',
  critical: '#ef4444',
  active: '#ef4444',
  offline: '#ef4444',
  info: '#3b82f6',
};

const STATUS_LABELS: Record<string, string> = {
  green: 'Healthy',
  yellow: 'Warning',
  red: 'Critical',
  normal: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
  active: 'Active',
  acknowledged: 'Ack',
  resolved: 'Resolved',
  online: 'Online',
  offline: 'Offline',
  stale: 'Stale',
  info: 'Info',
};

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] ?? '#94a3b8';
  const displayLabel = label ?? STATUS_LABELS[status] ?? status;
  const isMd = size === 'md';

  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }, isMd && styles.badgeMd]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }, isMd && styles.textMd]}>{displayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  textMd: {
    fontSize: 13,
  },
});
