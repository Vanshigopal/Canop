import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MD3 } from '@/config/theme';

import { DashboardScreen } from '@/screens/parent/DashboardScreen';
import { GradesScreen } from '@/screens/parent/GradesScreen';
import { AttendanceScreen } from '@/screens/parent/AttendanceScreen';
import { FeesScreen } from '@/screens/parent/FeesScreen';
import { ProfileScreen } from '@/screens/parent/ProfileScreen';

const Tab = createBottomTabNavigator();

const tabIcon = (label: string) =>
  function Icon({ color }: { color: string }) {
    return <Text style={{ fontSize: 18, color }}>{label}</Text>;
  };

export function ParentNavigator() {
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
        name="Grades"
        component={GradesScreen}
        options={{ tabBarLabel: 'Grades', tabBarIcon: tabIcon('\u272D') }}
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
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile', tabBarIcon: tabIcon('\u24D8') }}
      />
    </Tab.Navigator>
  );
}
