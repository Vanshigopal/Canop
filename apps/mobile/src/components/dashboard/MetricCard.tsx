import React, { type ReactNode } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { MD3 } from '@/config/theme';
import { Card } from '@/components/ui/Card';

interface Props {
  label: string;
  value: string;
  trend?: { delta: string; direction: 'up' | 'down' | 'flat' };
  icon?: ReactNode;
  accent?: string;
}

export function MetricCard({ label, value, trend, icon, accent }: Props) {
  const trendColor =
    trend?.direction === 'up'
      ? MD3.colors.success
      : trend?.direction === 'down'
      ? MD3.colors.error
      : MD3.colors.onSurfaceVariant;

  return (
    <Card style={accent ? { borderLeftWidth: 4, borderLeftColor: accent } : undefined}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
      </View>
      <Text style={styles.value}>{value}</Text>
      {trend ? (
        <Text style={[styles.trend, { color: trendColor }]}>
          {trend.direction === 'up' ? '\u2191' : trend.direction === 'down' ? '\u2193' : '\u2192'}{' '}
          {trend.delta}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...MD3.typography.labelSmall,
    color: MD3.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  icon: { opacity: 0.6 },
  value: {
    ...MD3.typography.headlineMedium,
    color: MD3.colors.onSurface,
    marginTop: MD3.spacing.xs,
  },
  trend: {
    ...MD3.typography.bodySmall,
    marginTop: 2,
  },
});
