import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useApiQuery } from '@/hooks/useApi';
import { api } from '@/api/client';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { attendanceSeverity, SEVERITY_COLORS } from '@/utils/severity';

interface BatchSummary {
  batchId: string;
  batchName: string;
  classStandard: string;
  presentCount: number;
  totalCount: number;
}

export function AttendanceScreen() {
  const { data, isLoading } = useApiQuery<{ batches: BatchSummary[]; overallPercent: number }>(
    ['admin-attendance-summary'],
    () => api.get('/dashboard/attendance-summary'),
  );

  return (
    <View style={styles.container}>
      <TopAppBar title="Attendance" subtitle={data ? `Overall ${data.overallPercent}%` : undefined} />
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading || !data ? (
          <Skeleton height={140} borderRadius={MD3.shape.large} />
        ) : (
          data.batches.map((b) => {
            const pct = b.totalCount > 0 ? Math.round((b.presentCount / b.totalCount) * 100) : 0;
            const sev = attendanceSeverity(pct);
            return (
              <Card key={b.batchId} style={styles.card}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{b.batchName}</Text>
                    <Text style={styles.meta}>{b.classStandard}</Text>
                  </View>
                  <Text style={[styles.percent, { color: SEVERITY_COLORS[sev].text }]}>
                    {pct}%
                  </Text>
                </View>
                <ProgressBar value={pct} color={SEVERITY_COLORS[sev].border} />
                <Text style={styles.bottom}>
                  {b.presentCount} / {b.totalCount} students
                </Text>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  content: { padding: MD3.spacing.md, paddingBottom: 100 },
  card: { marginBottom: MD3.spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MD3.spacing.sm,
  },
  name: { ...MD3.typography.titleMedium, color: MD3.colors.onSurface },
  meta: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant },
  percent: { ...MD3.typography.headlineSmall },
  bottom: {
    ...MD3.typography.bodySmall,
    color: MD3.colors.onSurfaceVariant,
    marginTop: MD3.spacing.xs,
  },
});
