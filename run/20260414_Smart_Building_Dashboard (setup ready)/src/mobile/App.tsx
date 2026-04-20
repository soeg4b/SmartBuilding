import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { AuthProvider, useAuth } from './src/lib/auth';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import InAppNotification from './src/components/InAppNotification';

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer
          theme={{
            dark: true,
            colors: {
              primary: '#3b82f6',
              background: '#0f172a',
              card: '#1e293b',
              text: '#f8fafc',
              border: '#334155',
              notification: '#ef4444',
            },
          }}
        >
          <StatusBar style="light" />
          <RootNavigator />
          <InAppNotification />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
