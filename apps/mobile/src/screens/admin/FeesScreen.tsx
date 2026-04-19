import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Admin } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatIndianCurrency } from '@/utils/indianNumbers';

interface FeesSummary {
  expectedRevenue: number;
  collectedRevenue: number;
  pendingRevenue: number;
  overdueAmount: number;
  collectionRate: number;
  studentsWithDues: number;
}

export function FeesScreen() {
  const { data, isLoading } = useApiQuery<FeesSummary>(['admin-fees'], () =>
    Admin.fees(),
  );

  return (
    <View style={styles.container}>
      <TopAppBar title="Fees" />
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading || !data ? (
          <Skeleton height={300} borderRadius={MD3.shape.large} />
        ) : (
          <>
            <Card style={styles.heroCard}>
              <Text style={styles.heroLabel}>Collected this term</Text>
              <Text style={styles.heroValue}>
                {formatIndianCurrency(data.collectedRevenue)}
              </Text>
              <Text style={styles.heroFootnote}>
                {data.collectionRate}% of {formatIndianCurrency(data.expectedRevenue)}
              </Text>
            </Card>

            <View style={styles.row}>
              <Card style={styles.tile}>
                <Text style={styles.tileLabel}>Pending</Text>
                <Text style={styles.tileValue}>{formatIndianCurrency(data.pendingRevenue)}</Text>
              </Card>
              <Card style={styles.tile}>
                <Text style={styles.tileLabel}>Overdue</Text>
                <Text style={[styles.tileValue, { color: MD3.colors.error }]}>
                  {formatIndianCurrency(data.overdueAmount)}
                </Text>
              </Card>
            </View>

            <Card style={styles.warningCard}>
              <Text style={styles.warningTitle}>{data.studentsWithDues} students with dues</Text>
              <Text style={styles.warningBody}>
                Open the web app to send reminder broadcasts.
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  content: { padding: MD3.spacing.md, paddingBottom: 100 },
  heroCard: { backgroundColor: MD3.colors.primaryContainer, marginBottom: MD3.spacing.md },
  heroLabel: { ...MD3.typography.labelSmall, color: MD3.colors.onPrimaryContainer },
  heroValue: {
    ...MD3.typography.displaySmall,
    color: MD3.colors.onPrimaryContainer,
    marginTop: 4,
  },
  heroFootnote: {
    ...MD3.typography.bodySmall,
    color: MD3.colors.onPrimaryContainer,
    marginTop: 4,
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: MD3.spacing.md },
  tile: { flex: 1 },
  tileLabel: {
    ...MD3.typography.labelSmall,
    color: MD3.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tileValue: {
    ...MD3.typography.titleLarge,
    color: MD3.colors.onSurface,
    marginTop: 4,
  },
  warningCard: {
    backgroundColor: MD3.colors.warningContainer,
  },
  warningTitle: { ...MD3.typography.titleMedium, color: MD3.colors.onWarningContainer },
  warningBody: {
    ...MD3.typography.bodySmall,
    color: MD3.colors.onWarningContainer,
    marginTop: 4,
  },
});
