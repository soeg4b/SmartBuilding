import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getSocket } from '../lib/socket';
import { useAuth } from '../lib/auth';

interface NotificationData {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: '#3b82f6',
  warning: '#eab308',
  critical: '#ef4444',
};

const SEVERITY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle',
  warning: 'warning',
  critical: 'alert-circle',
};

const DISPLAY_DURATION = 4000;

export default function InAppNotification() {
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setNotification(null));
  }, [translateY]);

  const show = useCallback(
    (data: NotificationData) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setNotification(data);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      timeoutRef.current = setTimeout(dismiss, DISPLAY_DURATION);
    },
    [translateY, dismiss],
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();
    const handleAlert = (event: { alert: { id: string; severity: string; message: string } }) => {
      show({
        id: event.alert.id,
        severity: (event.alert.severity as NotificationData['severity']) ?? 'info',
        message: event.alert.message,
      });
    };

    socket.on('alert:new', handleAlert);
    return () => {
      socket.off('alert:new', handleAlert);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isAuthenticated, show]);

  if (!notification) return null;

  const color = SEVERITY_COLORS[notification.severity] ?? '#3b82f6';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          top: insets.top + 8,
          borderLeftColor: color,
        },
      ]}
    >
      <TouchableOpacity style={styles.content} onPress={dismiss} activeOpacity={0.9}>
        <Ionicons
          name={SEVERITY_ICONS[notification.severity] ?? 'information-circle'}
          size={22}
          color={color}
        />
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
        <Ionicons name="close" size={18} color="#64748b" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: width - 32,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    borderLeftWidth: 4,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#f8fafc',
    lineHeight: 20,
  },
});
