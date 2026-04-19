import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MD3 } from '@/config/theme';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/auth/AuthContext';

export function TenantSelectScreen() {
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const { setTenant } = useAuth();

  async function handleContinue() {
    const trimmed = slug.trim().toLowerCase();
    if (!trimmed || trimmed.length < 3) {
      Alert.alert('Invalid', 'Please enter your institute code (3+ characters)');
      return;
    }
    setLoading(true);
    try {
      await setTenant(trimmed);
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
        <Text style={styles.title}>Welcome to Canop</Text>
        <Text style={styles.subtitle}>Enter your institute code to get started</Text>

        <View style={styles.form}>
          <TextField
            label="Institute code"
            value={slug}
            onChangeText={setSlug}
            placeholder="e.g. einstein-academy"
            autoCapitalize="none"
            autoCorrect={false}
            helperText="Provided by your institute administrator"
          />
          <Button
            label="Continue"
            onPress={handleContinue}
            loading={loading}
            fullWidth
            size="large"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: MD3.colors.background },
  scroll: { flexGrow: 1, padding: MD3.spacing.lg, justifyContent: 'center' },
  title: { ...MD3.typography.headlineLarge, color: MD3.colors.onSurface, marginBottom: 8 },
  subtitle: {
    ...MD3.typography.bodyLarge,
    color: MD3.colors.onSurfaceVariant,
    marginBottom: MD3.spacing.xl,
  },
  form: { marginTop: MD3.spacing.lg },
});
