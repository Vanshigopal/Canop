import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { MD3 } from '@/config/theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export function Chip({ label, selected = false, onPress, disabled = false }: Props) {
  return (
    <Pressable
      onPress={!disabled ? onPress : undefined}
      android_ripple={
        !disabled ? { color: 'rgba(0,0,0,0.08)', borderless: false } : undefined
      }
      style={[
        styles.base,
        selected ? styles.selected : styles.unselected,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: selected ? MD3.colors.onSecondaryContainer : MD3.colors.onSurfaceVariant },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: MD3.shape.small,
    borderWidth: 1,
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: MD3.colors.secondaryContainer,
    borderColor: MD3.colors.secondary,
  },
  unselected: {
    backgroundColor: 'transparent',
    borderColor: MD3.colors.outline,
  },
  disabled: { opacity: 0.38 },
  label: { ...MD3.typography.labelMedium },
});
