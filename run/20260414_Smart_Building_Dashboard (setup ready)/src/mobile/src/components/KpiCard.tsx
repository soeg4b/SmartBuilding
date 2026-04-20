import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trend?: { value: number; label?: string };
}

export default function KpiCard({
  title,
  value,
  unit,
  icon,
  iconColor = '#3b82f6',
  trend,
}: KpiCardProps) {
  const trendColor =
    trend && trend.value > 0
      ? '#ef4444'
      : trend && trend.value < 0
        ? '#22c55e'
        : '#94a3b8';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        {trend !== undefined && (
          <View style={styles.trendWrap}>
            <Ionicons
              name={
                trend.value > 0
                  ? 'trending-up'
                  : trend.value < 0
                    ? 'trending-down'
                    : 'remove'
              }
              size={14}
              color={trendColor}
            />
            <Text style={[styles.trendText, { color: trendColor }]}>
              {Math.abs(trend.value).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.value}>
        {value}
        {unit ? <Text style={styles.unit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.title}>{title}</Text>
      {trend?.label && <Text style={styles.trendLabel}>{trend.label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    flex: 1,
    minWidth: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  unit: {
    fontSize: 14,
    fontWeight: '400',
    color: '#94a3b8',
  },
  title: {
    fontSize: 13,
    color: '#94a3b8',
  },
  trendLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
