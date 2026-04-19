import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/auth/AuthContext';
import { APP_VERSION } from '@/config/constants';

interface Row {
  label: string;
  value?: string;
  onPress?: () => void;
}

export function SettingsScreen() {
  const { user, tenantSlug, logout } = useAuth();

  const profileRows: Row[] = [
    { label: 'Name', value: user?.name },
    { label: 'Email', value: user?.email ?? '\u2014' },
    { label: 'Phone', value: user?.phone ?? '\u2014' },
    { label: 'Role', value: user?.role },
    { label: 'Institute', value: tenantSlug ?? '\u2014' },
  ];

  return (
    <View style={styles.container}>
      <TopAppBar title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          {profileRows.map((row, idx) => (
            <View key={row.label} style={[styles.row, idx > 0 && styles.divider]}>
              <Text style={styles.label}>{row.label}</Text>
              <Text style={styles.value}>{row.value ?? '\u2014'}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Pressable
            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
            style={styles.row}
          >
            <Text style={styles.label}>Notification preferences</Text>
            <Text style={styles.chevron}>\u203A</Text>
          </Pressable>
          <Pressable
            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
            style={[styles.row, styles.divider]}
          >
            <Text style={styles.label}>Privacy</Text>
            <Text style={styles.chevron}>\u203A</Text>
          </Pressable>
          <View style={[styles.row, styles.divider]}>
            <Text style={styles.label}>App version</Text>
            <Text style={styles.value}>{APP_VERSION}</Text>
          </View>
        </Card>

        <Button label="Sign out" variant="outlined" onPress={logout} fullWidth />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  content: { padding: MD3.spacing.md, paddingBottom: 100 },
  card: { marginBottom: MD3.spacing.md, padding: 0 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: MD3.spacing.md,
    minHeight: 48,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: MD3.colors.outlineVariant },
  label: { ...MD3.typography.bodyMedium, color: MD3.colors.onSurface },
  value: { ...MD3.typography.bodyMedium, color: MD3.colors.onSurfaceVariant },
  chevron: { fontSize: 20, color: MD3.colors.onSurfaceVariant },
});
