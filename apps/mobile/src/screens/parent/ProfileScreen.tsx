import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/auth/AuthContext';

export function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <TopAppBar title="Profile" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name?.[0] ?? 'P').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          {user?.email ? <Text style={styles.meta}>{user.email}</Text> : null}
          {user?.phone ? <Text style={styles.meta}>{user.phone}</Text> : null}
        </Card>

        <Button label="Sign out" variant="outlined" onPress={logout} fullWidth />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  content: { padding: MD3.spacing.md, paddingBottom: 100 },
  card: { alignItems: 'center', marginBottom: MD3.spacing.lg },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: MD3.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: MD3.spacing.md,
  },
  avatarText: {
    ...MD3.typography.displayMedium,
    color: MD3.colors.onPrimaryContainer,
  },
  name: { ...MD3.typography.headlineSmall, color: MD3.colors.onSurface },
  meta: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurfaceVariant,
    marginTop: 2,
  },
});
