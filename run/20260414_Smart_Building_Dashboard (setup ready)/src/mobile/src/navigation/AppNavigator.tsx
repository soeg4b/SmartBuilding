import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import EnergyScreen from '../screens/EnergyScreen';
import EnvironmentScreen from '../screens/EnvironmentScreen';
import AssetsScreen from '../screens/AssetsScreen';
import AssetDetailScreen from '../screens/AssetDetailScreen';
import AlertsScreen from '../screens/AlertsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HSEChecklistScreen from '../screens/HSEChecklistScreen';
import PPECheckScreen from '../screens/PPECheckScreen';

export type MainTabParamList = {
  DashboardTab: undefined;
  EnergyTab: undefined;
  AssetsTab: undefined;
  AlertsTab: undefined;
  HSETab: undefined;
  SettingsTab: undefined;
};

export type AssetsStackParamList = {
  AssetsList: undefined;
  AssetDetail: { id: string; name: string };
};

export type DashboardStackParamList = {
  DashboardMain: undefined;
  Environment: undefined;
};

export type HSEStackParamList = {
  HSEChecklist: undefined;
  PPECheck: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const AssetsStack = createNativeStackNavigator<AssetsStackParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const HSEStack = createNativeStackNavigator<HSEStackParamList>();

function DashboardStackNavigator() {
  return (
    <DashboardStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    >
      <DashboardStack.Screen name="DashboardMain" component={DashboardScreen} />
      <DashboardStack.Screen name="Environment" component={EnvironmentScreen} />
    </DashboardStack.Navigator>
  );
}

function AssetsStackNavigator() {
  return (
    <AssetsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    >
      <AssetsStack.Screen name="AssetsList" component={AssetsScreen} />
      <AssetsStack.Screen name="AssetDetail" component={AssetDetailScreen} />
    </AssetsStack.Navigator>
  );
}

function HSEStackNavigator() {
  return (
    <HSEStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    >
      <HSEStack.Screen name="HSEChecklist" component={HSEChecklistScreen} />
      <HSEStack.Screen name="PPECheck" component={PPECheckScreen} />
    </HSEStack.Navigator>
  );
}

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  DashboardTab: 'home',
  EnergyTab: 'flash',
  AssetsTab: 'construct',
  AlertsTab: 'notifications',
  HSETab: 'shield-checkmark',
  SettingsTab: 'settings',
};

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStackNavigator}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="EnergyTab"
        component={EnergyScreen}
        options={{ tabBarLabel: 'Energy' }}
      />
      <Tab.Screen
        name="AssetsTab"
        component={AssetsStackNavigator}
        options={{ tabBarLabel: 'Assets' }}
      />
      <Tab.Screen
        name="AlertsTab"
        component={AlertsScreen}
        options={{ tabBarLabel: 'Alerts' }}
      />
      <Tab.Screen
        name="HSETab"
        component={HSEStackNavigator}
        options={{ tabBarLabel: 'HSE' }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}
