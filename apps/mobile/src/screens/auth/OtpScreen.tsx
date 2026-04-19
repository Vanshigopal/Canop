import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { MD3 } from '@/config/theme';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/auth/AuthContext';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export function OtpScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Otp'>>();
  const { loginWithOtp, requestOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    if (otp.length !== 6) {
      Alert.alert('Invalid', 'Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await loginWithOtp(route.params.phone, otp);
    } catch (err: unknown) {
      Alert.alert('Wrong code', err instanceof Error ? err.message : 'Try again');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    try {
      await requestOtp(route.params.phone);
      Alert.alert('Sent', 'A new code has been sent');
    } catch (err: unknown) {
      Alert.alert('Resend failed', err instanceof Error ? err.message : 'Try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Enter verification code</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to {route.params.phone}</Text>

        <View style={styles.form}>
          <TextField
            label="Verification code"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
          />
          <Button
            label="Verify and sign in"
            onPress={handleVerify}
            loading={loading}
            fullWidth
            size="large"
          />
          <Button
            label="Resend code"
            variant="text"
            onPress={handleResend}
            disabled={loading}
            fullWidth
            style={{ marginTop: MD3.spacing.sm }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: MD3.colors.background },
  scroll: { flexGrow: 1, padding: MD3.spacing.lg, justifyContent: 'center' },
  title: { ...MD3.typography.headlineLarge, color: MD3.colors.onSurface, marginBottom: 4 },
  subtitle: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurfaceVariant,
    marginBottom: MD3.spacing.lg,
  },
  form: { marginTop: MD3.spacing.sm },
});
