import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MD3 } from '@/config/theme';
import { SEVERITY_COLORS, type Severity } from '@/utils/severity';

export type BadgeTone = Severity | 'primary' | 'secondary';

interface Props {
  label: string;
  color?: BadgeTone;
  size?: 'small' | 'medium';
}

export function Badge({ label, color = 'neutral', size = 'medium' }: Props) {
  const tone = colorToTone[color];
  return (
    <View
      style={[
        styles.base,
        size === 'small' ? styles.small : styles.medium,
        { backgroundColor: tone.bg, borderColor: tone.border },
      ]}
    >
      <Text style={[styles.text, { color: tone.text }, size === 'small' && styles.textSmall]}>
        {label}
      </Text>
    </View>
  );
}

const colorToTone: Record<BadgeTone, { bg: string; text: string; border: string }> = {
  ...SEVERITY_COLORS,
  primary: {
    bg: MD3.colors.primaryContainer,
    text: MD3.colors.onPrimaryContainer,
    border: MD3.colors.primary,
  },
  secondary: {
    bg: MD3.colors.secondaryContainer,
    text: MD3.colors.onSecondaryContainer,
    border: MD3.colors.secondary,
  },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: MD3.shape.small,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  small: { paddingHorizontal: 6, paddingVertical: 2 },
  medium: { paddingHorizontal: 10, paddingVertical: 4 },
  text: {
    ...MD3.typography.labelSmall,
    textTransform: 'capitalize',
  },
  textSmall: { fontSize: 10 },
});
