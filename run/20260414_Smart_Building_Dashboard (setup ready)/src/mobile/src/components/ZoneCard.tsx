import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';

interface ZoneReading {
  value: number;
  unit: string;
  status: string;
}

interface ZoneCardProps {
  name: string;
  floorName: string;
  status: 'normal' | 'warning' | 'critical';
  readings: {
    temperature?: ZoneReading;
    humidity?: ZoneReading;
    co2?: ZoneReading & { aqiLabel?: string };
  };
}

export default function ZoneCard({ name, floorName, status, readings }: ZoneCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.floor}>{floorName}</Text>
        </View>
        <StatusBadge status={status} />
      </View>
      <View style={styles.readingsRow}>
        {readings.temperature && (
          <View style={styles.reading}>
            <Ionicons name="thermometer-outline" size={16} color="#f97316" />
            <Text style={styles.readingValue}>
              {readings.temperature.value.toFixed(1)}°C
            </Text>
          </View>
        )}
        {readings.humidity && (
          <View style={styles.reading}>
            <Ionicons name="water-outline" size={16} color="#06b6d4" />
            <Text style={styles.readingValue}>
              {readings.humidity.value.toFixed(0)}%
            </Text>
          </View>
        )}
        {readings.co2 && (
          <View style={styles.reading}>
            <Ionicons name="cloud-outline" size={16} color="#a78bfa" />
            <Text style={styles.readingValue}>
              {readings.co2.value.toFixed(0)} ppm
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleWrap: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
  },
  floor: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  readingsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  reading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e2e8f0',
  },
});
