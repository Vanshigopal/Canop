import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MD3 } from '@/config/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatIndianCurrency } from '@/utils/indianNumbers';
import { formatDate } from '@/utils/dateFormat';
import { feeSeverity } from '@/utils/severity';

export interface Installment {
  id: string;
  label: string;
  amount: number;
  dueDate: string;
  paidAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  daysOverdue?: number;
}

interface Props {
  installment: Installment;
  onPay?: () => void;
}

export function InstallmentCard({ installment, onPay }: Props) {
  const isPaid = installment.status === 'PAID';
  const remaining = installment.amount - installment.paidAmount;
  const severity = isPaid ? 'excellent' : feeSeverity(installment.daysOverdue ?? 0);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{installment.label}</Text>
          <Text style={styles.dueDate}>Due {formatDate(installment.dueDate)}</Text>
        </View>
        <Badge label={installment.status} color={severity} />
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amount}>{formatIndianCurrency(installment.amount)}</Text>
        {!isPaid && installment.paidAmount > 0 ? (
          <Text style={styles.paidLabel}>
            Paid {formatIndianCurrency(installment.paidAmount)}
          </Text>
        ) : null}
      </View>

      {!isPaid && onPay ? (
        <Button
          label={`Pay ${formatIndianCurrency(remaining)}`}
          onPress={onPay}
          fullWidth
          style={{ marginTop: MD3.spacing.sm }}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: MD3.spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  label: { ...MD3.typography.titleMedium, color: MD3.colors.onSurface },
  dueDate: {
    ...MD3.typography.bodySmall,
    color: MD3.colors.onSurfaceVariant,
    marginTop: 2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: MD3.spacing.sm,
  },
  amount: { ...MD3.typography.headlineSmall, color: MD3.colors.onSurface },
  paidLabel: {
    ...MD3.typography.bodySmall,
    color: MD3.colors.onSurfaceVariant,
    marginLeft: 8,
  },
});
