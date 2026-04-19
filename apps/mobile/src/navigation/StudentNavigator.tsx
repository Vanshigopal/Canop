import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MD3 } from '@/config/theme';

import { DashboardScreen } from '@/screens/student/DashboardScreen';
import { GradesScreen } from '@/screens/student/GradesScreen';
import { AttendanceScreen } from '@/screens/student/AttendanceScreen';
import { FeesScreen } from '@/screens/student/FeesScreen';
import { AssignmentsScreen } from '@/screens/student/AssignmentsScreen';
import { VideosScreen } from '@/screens/student/VideosScreen';
import { ProfileScreen } from '@/screens/student/ProfileScreen';
import { NotificationsScreen } from '@/screens/shared/NotificationsScreen';
import { VideoPlayerScreen } from '@/screens/shared/VideoPlayerScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

const tabIcon = (label: string) =>
  function Icon({ color }: { color: string }) {
    return <Text style={{ fontSize: 18, color }}>{label}</Text>;
  };

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
      <HomeStack.Screen name="Assignments" component={AssignmentsScreen} />
      <HomeStack.Screen name="Videos" component={VideosScreen} />
      <HomeStack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
      <HomeStack.Screen name="Profile" component={ProfileScreen} />
    </HomeStack.Navigator>
  );
}

export function StudentNavigator() {
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
        name="Home"
        component={HomeStackNavigator}
        options={{ tabBarLabel: 'Home', tabBarIcon: tabIcon('\u2630') }}
      />
      <Tab.Screen
        name="Classes"
        component={AttendanceScreen}
        options={{ tabBarLabel: 'Classes', tabBarIcon: tabIcon('\u2713') }}
      />
      <Tab.Screen
        name="Grades"
        component={GradesScreen}
        options={{ tabBarLabel: 'Grades', tabBarIcon: tabIcon('\u272D') }}
      />
      <Tab.Screen
        name="Fees"
        component={FeesScreen}
        options={{ tabBarLabel: 'Fees', tabBarIcon: tabIcon('\u20B9') }}
      />
      <Tab.Screen
        name="Inbox"
        component={NotificationsScreen}
        options={{ tabBarLabel: 'Inbox', tabBarIcon: tabIcon('\u2709') }}
      />
    </Tab.Navigator>
  );
}
