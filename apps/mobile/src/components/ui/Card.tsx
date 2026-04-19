import React, { type ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle, Pressable } from 'react-native';
import { MD3 } from '@/config/theme';

interface Props {
  children: ReactNode;
  variant?: 'elevated' | 'filled' | 'outlined';
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function Card({ children, variant = 'elevated', style, onPress }: Props) {
  const containerStyle = [
    styles.base,
    variantStyles[variant],
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: false }}
        style={({ pressed }) => [containerStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: MD3.shape.large,
    padding: MD3.spacing.md,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.94 },
});

const variantStyles: Record<string, ViewStyle> = {
  elevated: {
    backgroundColor: MD3.colors.surface,
    ...MD3.elevation.level1,
  },
  filled: {
    backgroundColor: MD3.colors.surfaceVariant,
  },
  outlined: {
    backgroundColor: MD3.colors.surface,
    borderWidth: 1,
    borderColor: MD3.colors.outlineVariant,
  },
};
