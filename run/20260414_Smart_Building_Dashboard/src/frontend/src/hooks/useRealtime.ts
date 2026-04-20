'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';
import type {
  WsSensorReading,
  WsAlertEvent,
  WsSystemEvent,
  AlertSummary,
} from '@smart-building/shared/types';

export interface EnergySummaryEvent {
  buildingId: string;
  totalKwh: number;
  peakKw: number;
  powerFactor: number;
  costIdr: number;
  timestamp: string;
}

export interface EquipmentHealthEvent {
  equipmentId: string;
  buildingId: string;
  name: string;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
}

export interface RealtimeData {
  sensorReadings: Map<string, WsSensorReading>;
  latestAlert: AlertSummary | null;
  alerts: AlertSummary[];
  energySummary: EnergySummaryEvent | null;
  equipmentHealth: Map<string, EquipmentHealthEvent>;
  systemEvents: WsSystemEvent[];
  connected: boolean;
}

interface UseRealtimeOptions {
  buildingId?: string | null;
  roomIds?: string[];
  enabled?: boolean;
}

export function useRealtime(options: UseRealtimeOptions = {}): RealtimeData {
  const { buildingId, roomIds = [], enabled = true } = options;

  const [connected, setConnected] = useState(false);
  const [sensorReadings, setSensorReadings] = useState<Map<string, WsSensorReading>>(new Map());
  const [latestAlert, setLatestAlert] = useState<AlertSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertSummary[]>([]);
  const [energySummary, setEnergySummary] = useState<EnergySummaryEvent | null>(null);
  const [equipmentHealth, setEquipmentHealth] = useState<Map<string, EquipmentHealthEvent>>(new Map());
  const [systemEvents, setSystemEvents] = useState<WsSystemEvent[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const prevRoomsRef = useRef<string[]>([]);

  const handleSensorReading = useCallback((data: WsSensorReading) => {
    setSensorReadings((prev) => {
      const next = new Map(prev);
      next.set(data.sensorId, data);
      return next;
    });
  }, []);

  const handleNewAlert = useCallback((data: WsAlertEvent) => {
    setLatestAlert(data.alert);
    setAlerts((prev) => [data.alert, ...prev].slice(0, 100));
  }, []);

  const handleEnergySummary = useCallback((data: EnergySummaryEvent) => {
    setEnergySummary(data);
  }, []);

  const handleEquipmentHealth = useCallback((data: EquipmentHealthEvent) => {
    setEquipmentHealth((prev) => {
      const next = new Map(prev);
      next.set(data.equipmentId, data);
      return next;
    });
  }, []);

  const handleSystemEvent = useCallback((data: WsSystemEvent) => {
    setSystemEvents((prev) => [data, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('sensor:reading', handleSensorReading);
    socket.on('alert:new', handleNewAlert);
    socket.on('energy:summary', handleEnergySummary);
    socket.on('equipment:health', handleEquipmentHealth);
    socket.on('system:event', handleSystemEvent);

    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('sensor:reading', handleSensorReading);
      socket.off('alert:new', handleNewAlert);
      socket.off('energy:summary', handleEnergySummary);
      socket.off('equipment:health', handleEquipmentHealth);
      socket.off('system:event', handleSystemEvent);
      socketRef.current = null;
    };
  }, [enabled, handleSensorReading, handleNewAlert, handleEnergySummary, handleEquipmentHealth, handleSystemEvent]);

  // Manage building/room subscriptions
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    if (buildingId) {
      socket.emit('join:building', buildingId);
    }

    return () => {
      if (buildingId && socket.connected) {
        socket.emit('leave:building', buildingId);
      }
    };
  }, [buildingId, connected]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    const prevRooms = prevRoomsRef.current;
    const toLeave = prevRooms.filter((r) => !roomIds.includes(r));
    const toJoin = roomIds.filter((r) => !prevRooms.includes(r));

    toLeave.forEach((id) => socket.emit('leave:room', id));
    toJoin.forEach((id) => socket.emit('join:room', id));

    prevRoomsRef.current = roomIds;
  }, [roomIds, connected]);

  return {
    sensorReadings,
    latestAlert,
    alerts,
    energySummary,
    equipmentHealth,
    systemEvents,
    connected,
  };
}
