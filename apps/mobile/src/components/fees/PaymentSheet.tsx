import React, { useState } from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
// @ts-expect-error — native module shipped at install time
import RazorpayCheckout from 'react-native-razorpay';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Payments } from '@/api/endpoints';
import { MD3 } from '@/config/theme';
import { formatIndianCurrency } from '@/utils/indianNumbers';
import { useAuth } from '@/auth/AuthContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  installmentId: string;
  amount: number;
  label: string;
  onSuccess: () => void;
}

export function PaymentSheet({
  visible,
  onClose,
  installmentId,
  amount,
  label,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  async function handlePay() {
    setLoading(true);
    try {
      const { data: orderRes } = await Payments.createOrder(installmentId);
      const order = orderRes.data;

      const checkoutOptions = {
        key: order.razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: 'Raquel',
        description: label,
        order_id: order.razorpayOrderId,
        prefill: {
          name: user?.name ?? '',
          email: user?.email ?? '',
          contact: user?.phone ?? '',
        },
        theme: { color: MD3.colors.primary },
      };

      const result = await RazorpayCheckout.open(checkoutOptions);
      await Payments.verify(
        result.razorpay_order_id,
        result.razorpay_payment_id,
        result.razorpay_signature,
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      Alert.alert('Payment failed', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.heading}>Confirm payment</Text>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.amount}>{formatIndianCurrency(amount)}</Text>

        <Button
          label="Pay with Razorpay"
          onPress={handlePay}
          loading={loading}
          fullWidth
          style={{ marginTop: MD3.spacing.lg }}
        />
        <Button
          label="Cancel"
          variant="text"
          onPress={onClose}
          fullWidth
          style={{ marginTop: MD3.spacing.sm }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: MD3.spacing.md },
  heading: { ...MD3.typography.titleLarge, color: MD3.colors.onSurface },
  label: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurfaceVariant,
    marginTop: MD3.spacing.xs,
  },
  amount: {
    ...MD3.typography.displaySmall,
    color: MD3.colors.onSurface,
    marginTop: MD3.spacing.md,
  },
});
