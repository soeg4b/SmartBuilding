import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';

type AlertSeverity = 'info' | 'warning' | 'critical';
type AlertStatus = 'active' | 'acknowledged' | 'resolved';

interface AlertItemProps {
  id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  triggeredAt: string;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

const SEVERITY_ICONS: Record<AlertSeverity, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle',
  warning: 'warning',
  critical: 'alert-circle',
};

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  info: '#3b82f6',
  warning: '#eab308',
  critical: '#ef4444',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AlertItem({
  id,
  severity,
  status,
  message,
  triggeredAt,
  onAcknowledge,
  onResolve,
}: AlertItemProps) {
  const color = SEVERITY_COLORS[severity];
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.topRow}>
        <Ionicons name={SEVERITY_ICONS[severity]} size={20} color={color} />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>
      <View style={styles.bottomRow}>
        <StatusBadge status={status} />
        <Text style={styles.time}>{timeAgo(triggeredAt)}</Text>
      </View>
      {status !== 'resolved' && (
        <View style={styles.actions}>
          {status === 'active' && onAcknowledge && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.ackBtn]}
              onPress={() => onAcknowledge(id)}
            >
              <Text style={styles.actionText}>Acknowledge</Text>
            </TouchableOpacity>
          )}
          {onResolve && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.resolveBtn]}
              onPress={() => onResolve(id)}
            >
              <Text style={styles.actionText}>Resolve</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#f8fafc',
    lineHeight: 20,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 12,
    color: '#64748b',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  ackBtn: {
    backgroundColor: '#eab30820',
  },
  resolveBtn: {
    backgroundColor: '#22c55e20',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
});
