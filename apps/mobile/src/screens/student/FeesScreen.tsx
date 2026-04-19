import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Student } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { InstallmentCard, type Installment } from '@/components/fees/InstallmentCard';
import { PaymentSheet } from '@/components/fees/PaymentSheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { formatIndianCurrency } from '@/utils/indianNumbers';

interface FeesData {
  summary: {
    totalAnnual: number;
    paid: number;
    pending: number;
    overdue: number;
  };
  installments: Installment[];
}

export function FeesScreen() {
  const queryClient = useQueryClient();
  const [activeInstallment, setActiveInstallment] = useState<Installment | null>(null);

  const { data, isLoading, refetch, isRefetching } = useApiQuery<FeesData>(
    ['student-fees'],
    () => Student.fees(),
  );

  return (
    <View style={styles.container}>
      <TopAppBar title="Fees" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading || !data ? (
          <>
            <Skeleton height={120} borderRadius={MD3.shape.large} style={{ marginBottom: 12 }} />
            <Skeleton height={140} borderRadius={MD3.shape.large} />
          </>
        ) : (
          <>
            <Card style={styles.summary}>
              <Text style={styles.summaryLabel}>Pending</Text>
              <Text style={styles.summaryValue}>
                {formatIndianCurrency(data.summary.pending)}
              </Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryMeta}>
                  Paid {formatIndianCurrency(data.summary.paid)}
                </Text>
                {data.summary.overdue > 0 ? (
                  <Text style={[styles.summaryMeta, { color: MD3.colors.error }]}>
                    Overdue {formatIndianCurrency(data.summary.overdue)}
                  </Text>
                ) : null}
              </View>
            </Card>

            <Text style={styles.sectionTitle}>Installments</Text>
            {data.installments.length === 0 ? (
              <Text style={styles.empty}>No installments scheduled</Text>
            ) : (
              data.installments.map((i) => (
                <InstallmentCard
                  key={i.id}
                  installment={i}
                  onPay={i.status !== 'PAID' ? () => setActiveInstallment(i) : undefined}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      {activeInstallment ? (
        <PaymentSheet
          visible
          onClose={() => setActiveInstallment(null)}
          installmentId={activeInstallment.id}
          amount={activeInstallment.amount - activeInstallment.paidAmount}
          label={activeInstallment.label}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ['student-fees'] })
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  content: { padding: MD3.spacing.md, paddingBottom: 100 },
  summary: { marginBottom: MD3.spacing.lg },
  summaryLabel: {
    ...MD3.typography.labelSmall,
    color: MD3.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryValue: {
    ...MD3.typography.displaySmall,
    color: MD3.colors.onSurface,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: MD3.spacing.sm,
  },
  summaryMeta: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant },
  sectionTitle: {
    ...MD3.typography.titleMedium,
    color: MD3.colors.onSurface,
    marginBottom: MD3.spacing.sm,
  },
  empty: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: MD3.spacing.lg,
  },
});
