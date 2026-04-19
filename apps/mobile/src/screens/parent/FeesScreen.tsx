import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Parent } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { SecureStorage } from '@/auth/SecureStorage';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { InstallmentCard, type Installment } from '@/components/fees/InstallmentCard';
import { PaymentSheet } from '@/components/fees/PaymentSheet';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
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
  const [childId, setChildId] = useState<string | null>(null);
  const [activeInstallment, setActiveInstallment] = useState<Installment | null>(null);

  useEffect(() => {
    SecureStorage.getSelectedChildId().then(setChildId);
  }, []);

  const { data, isLoading } = useApiQuery<FeesData>(
    ['parent-fees', childId],
    () => Parent.fees(childId!),
    { enabled: Boolean(childId) },
  );

  return (
    <View style={styles.container}>
      <TopAppBar title="Fees" />
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading || !data ? (
          <Skeleton height={300} borderRadius={MD3.shape.large} />
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
            {data.installments.map((i) => (
              <InstallmentCard
                key={i.id}
                installment={i}
                onPay={i.status !== 'PAID' ? () => setActiveInstallment(i) : undefined}
              />
            ))}
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
            queryClient.invalidateQueries({ queryKey: ['parent-fees', childId] })
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
});
