import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MD3 } from '@/config/theme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { marksSeverity } from '@/utils/severity';

interface Props {
  examName: string;
  subject: string;
  percentage: number;
  cutOff: number;
  grade: string;
  rank?: number;
  totalStudents?: number;
  trend?: 'up' | 'down' | 'flat';
}

export function ResultCard({
  examName,
  subject,
  percentage,
  cutOff,
  grade,
  rank,
  totalStudents,
  trend,
}: Props) {
  const severity = marksSeverity(percentage, cutOff);

  return (
    <Card style={styles.card}>
      <Text style={styles.examName}>{examName}</Text>
      <Text style={styles.subject}>{subject}</Text>

      <View style={styles.row}>
        <Text style={styles.percentage}>{percentage}%</Text>
        <Badge label={grade} color={severity} />
        {trend ? (
          <Text style={[styles.trend, { color: trendColor(trend) }]}>
            {trend === 'up' ? '\u2191' : trend === 'down' ? '\u2193' : '\u2192'}
          </Text>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>Cut-off {cutOff}%</Text>
        {rank ? (
          <Text style={styles.meta}>
            Rank #{rank}
            {totalStudents ? ` of ${totalStudents}` : ''}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

function trendColor(trend: 'up' | 'down' | 'flat'): string {
  if (trend === 'up') return MD3.colors.success;
  if (trend === 'down') return MD3.colors.error;
  return MD3.colors.onSurfaceVariant;
}

const styles = StyleSheet.create({
  card: { marginBottom: MD3.spacing.sm },
  examName: { ...MD3.typography.titleMedium, color: MD3.colors.onSurface },
  subject: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginTop: MD3.spacing.sm,
  },
  percentage: { ...MD3.typography.headlineSmall, color: MD3.colors.onSurface },
  trend: { fontSize: 18 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: MD3.spacing.xs,
  },
  meta: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant },
});
