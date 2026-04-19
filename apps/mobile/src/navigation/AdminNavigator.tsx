import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MD3 } from '@/config/theme';

import { DashboardScreen } from '@/screens/admin/DashboardScreen';
import { StudentsScreen } from '@/screens/admin/StudentsScreen';
import { AttendanceScreen } from '@/screens/admin/AttendanceScreen';
import { FeesScreen } from '@/screens/admin/FeesScreen';
import { SettingsScreen } from '@/screens/admin/SettingsScreen';

const Tab = createBottomTabNavigator();

const tabIcon = (label: string) =>
  function Icon({ color }: { color: string }) {
    return <Text style={{ fontSize: 18, color }}>{label}</Text>;
  };

export function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: MD3.colors.primary,
        tabBarInactiveTintColor: MD3.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: MD3.colors.surface,
          borderTopColor: MD3.colors.outlineVariant,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home', tabBarIcon: tabIcon('\u2630') }}
      />
      <Tab.Screen
        name="Students"
        component={StudentsScreen}
        options={{ tabBarLabel: 'Students', tabBarIcon: tabIcon('\u2638') }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{ tabBarLabel: 'Attendance', tabBarIcon: tabIcon('\u2713') }}
      />
      <Tab.Screen
        name="Fees"
        component={FeesScreen}
        options={{ tabBarLabel: 'Fees', tabBarIcon: tabIcon('\u20B9') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings', tabBarIcon: tabIcon('\u2699') }}
      />
    </Tab.Navigator>
  );
}
