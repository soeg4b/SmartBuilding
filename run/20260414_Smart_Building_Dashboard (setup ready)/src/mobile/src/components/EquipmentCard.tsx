import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';

type HealthStatus = 'green' | 'yellow' | 'red';
type EquipmentType =
  | 'genset' | 'pump' | 'ahu' | 'chiller' | 'boiler' | 'elevator' | 'transformer';

const TYPE_ICONS: Record<EquipmentType, keyof typeof Ionicons.glyphMap> = {
  genset: 'battery-charging',
  pump: 'water',
  ahu: 'cloudy',
  chiller: 'snow',
  boiler: 'flame',
  elevator: 'arrow-up',
  transformer: 'flash',
};

interface EquipmentCardProps {
  id: string;
  name: string;
  type: EquipmentType;
  healthStatus: HealthStatus;
  location: string;
  onPress?: (id: string, name: string) => void;
}

export default function EquipmentCard({
  id,
  name,
  type,
  healthStatus,
  location,
  onPress,
}: EquipmentCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(id, name)}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={TYPE_ICONS[type] ?? 'hardware-chip'}
          size={24}
          color="#3b82f6"
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.location}>{location}</Text>
        <Text style={styles.type}>{type.toUpperCase()}</Text>
      </View>
      <View style={styles.right}>
        <StatusBadge status={healthStatus} />
        <Ionicons name="chevron-forward" size={18} color="#64748b" style={styles.chevron} />
      </View>
    </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#3b82f620',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
  },
  location: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  type: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  right: {
    alignItems: 'flex-end',
    gap: 8,
  },
  chevron: {
    marginTop: 4,
  },
});
