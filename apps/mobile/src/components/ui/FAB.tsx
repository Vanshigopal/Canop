import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MD3 } from '@/config/theme';

interface Props {
  icon: ReactNode;
  label?: string;
  onPress: () => void;
  extended?: boolean;
}

export function FAB({ icon, label, onPress, extended = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.18)', borderless: false }}
      style={({ pressed }) => [
        styles.base,
        extended ? styles.extended : styles.standard,
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.iconWrap}>{icon}</View>
      {extended && label ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: MD3.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...MD3.elevation.level3,
  },
  standard: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  extended: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 20,
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  label: {
    ...MD3.typography.labelLarge,
    color: MD3.colors.onPrimary,
    marginLeft: 12,
  },
});
