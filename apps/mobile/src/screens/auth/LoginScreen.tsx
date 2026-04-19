import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MD3 } from '@/config/theme';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/auth/AuthContext';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Mode = 'email' | 'phone';

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login, requestOtp, tenantSlug } = useAuth();

  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing', 'Email and password are required');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      Alert.alert('Login failed', err instanceof Error ? err.message : 'Try again');
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneLogin() {
    const trimmed = phone.trim();
    if (!/^\+\d{10,15}$/.test(trimmed)) {
      Alert.alert('Invalid', 'Phone must be in international format (+91XXXXXXXXXX)');
      return;
    }
    setLoading(true);
    try {
      await requestOtp(trimmed);
      navigation.navigate('Otp', { phone: trimmed });
    } catch (err: unknown) {
      Alert.alert('Could not send OTP', err instanceof Error ? err.message : 'Try again');
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
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>{tenantSlug ?? 'Select institute first'}</Text>

        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setMode('email')}
            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
            style={[styles.tab, mode === 'email' && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, mode === 'email' && styles.tabLabelActive]}>
              Email
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('phone')}
            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
            style={[styles.tab, mode === 'phone' && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, mode === 'phone' && styles.tabLabelActive]}>
              Phone OTP
            </Text>
          </Pressable>
        </View>

        {mode === 'email' ? (
          <View style={styles.form}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@institute.com"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <Button
              label="Sign in"
              onPress={handleEmailLogin}
              loading={loading}
              fullWidth
              size="large"
            />
          </View>
        ) : (
          <View style={styles.form}>
            <TextField
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+919876543210"
              helperText="We'll text you a 6-digit code"
            />
            <Button
              label="Send OTP"
              onPress={handlePhoneLogin}
              loading={loading}
              fullWidth
              size="large"
            />
          </View>
        )}
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
  modeRow: { flexDirection: 'row', marginBottom: MD3.spacing.md, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: MD3.shape.full,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: MD3.colors.outline,
  },
  tabActive: {
    backgroundColor: MD3.colors.primaryContainer,
    borderColor: MD3.colors.primary,
  },
  tabLabel: { ...MD3.typography.labelLarge, color: MD3.colors.onSurfaceVariant },
  tabLabelActive: { color: MD3.colors.onPrimaryContainer },
  form: { marginTop: MD3.spacing.sm },
});
