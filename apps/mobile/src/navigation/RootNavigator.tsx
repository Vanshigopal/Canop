import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/auth/AuthContext';
import { MD3 } from '@/config/theme';

import { TenantSelectScreen } from '@/screens/auth/TenantSelectScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { OtpScreen } from '@/screens/auth/OtpScreen';

import { AdminNavigator } from './AdminNavigator';
import { TeacherNavigator } from './TeacherNavigator';
import { StudentNavigator } from './StudentNavigator';
import { ParentNavigator } from './ParentNavigator';

export type RootStackParamList = {
  TenantSelect: undefined;
  Login: undefined;
  Otp: { phone: string };
  AdminHome: undefined;
  TeacherHome: undefined;
  StudentHome: undefined;
  ParentHome: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['canop://', 'https://canop.app', 'https://*.canop.app'],
  config: {
    screens: {
      TenantSelect: 'tenant',
      Login: 'login',
      AdminHome: 'admin',
      TeacherHome: 'teacher',
      StudentHome: 'student',
      ParentHome: 'parent',
    },
  },
};

export function RootNavigator() {
  const { user, isLoading, isAuthenticated, tenantSlug } = useAuth();

  if (isLoading) {
    return (
      <View style={loadingStyle}>
        <ActivityIndicator size="large" color={MD3.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        {!isAuthenticated ? (
          <>
            {!tenantSlug ? (
              <Stack.Screen name="TenantSelect" component={TenantSelectScreen} />
            ) : null}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Otp" component={OtpScreen} />
          </>
        ) : user?.role === 'ADMIN' || user?.role === 'STAFF' ? (
          <Stack.Screen name="AdminHome" component={AdminNavigator} />
        ) : user?.role === 'TEACHER' ? (
          <Stack.Screen name="TeacherHome" component={TeacherNavigator} />
        ) : user?.role === 'STUDENT' ? (
          <Stack.Screen name="StudentHome" component={StudentNavigator} />
        ) : (
          <Stack.Screen name="ParentHome" component={ParentNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const loadingStyle = {
  flex: 1,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  backgroundColor: MD3.colors.background,
};
