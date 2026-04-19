import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MD3 } from '@/config/theme';

import { DashboardScreen } from '@/screens/teacher/DashboardScreen';
import { AttendanceScreen } from '@/screens/teacher/AttendanceScreen';
import { ExamsScreen } from '@/screens/teacher/ExamsScreen';
import { BatchesScreen } from '@/screens/teacher/BatchesScreen';
import { NotificationsScreen } from '@/screens/shared/NotificationsScreen';

const Tab = createBottomTabNavigator();

const tabIcon = (label: string) =>
  function Icon({ color }: { color: string }) {
    return <Text style={{ fontSize: 18, color }}>{label}</Text>;
  };

export function TeacherNavigator() {
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
        name="Attendance"
        component={AttendanceScreen}
        options={{ tabBarLabel: 'Attendance', tabBarIcon: tabIcon('\u2713') }}
      />
      <Tab.Screen
        name="Exams"
        component={ExamsScreen}
        options={{ tabBarLabel: 'Exams', tabBarIcon: tabIcon('\u270D') }}
      />
      <Tab.Screen
        name="Batches"
        component={BatchesScreen}
        options={{ tabBarLabel: 'Batches', tabBarIcon: tabIcon('\u2638') }}
      />
      <Tab.Screen
        name="Inbox"
        component={NotificationsScreen}
        options={{ tabBarLabel: 'Inbox', tabBarIcon: tabIcon('\u2709') }}
      />
    </Tab.Navigator>
  );
}
