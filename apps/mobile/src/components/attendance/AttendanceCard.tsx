import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MD3 } from '@/config/theme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { attendanceSeverity, SEVERITY_COLORS } from '@/utils/severity';

interface Props {
  subject: string;
  presentCount: number;
  totalCount: number;
  lastSession?: string;
}

export function AttendanceCard({ subject, presentCount, totalCount, lastSession }: Props) {
  const percent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  const severity = attendanceSeverity(percent);
  const colors = SEVERITY_COLORS[severity];

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.subject}>{subject}</Text>
        <Badge label={`${percent}%`} color={severity} />
      </View>

      <ProgressBar value={percent} color={colors.border} />

      <View style={styles.footer}>
        <Text style={styles.meta}>
          {presentCount} of {totalCount} sessions
        </Text>
        {lastSession ? <Text style={styles.meta}>Last: {lastSession}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: MD3.spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MD3.spacing.sm,
  },
  subject: { ...MD3.typography.titleMedium, color: MD3.colors.onSurface, flex: 1 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: MD3.spacing.xs,
  },
  meta: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant },
});
