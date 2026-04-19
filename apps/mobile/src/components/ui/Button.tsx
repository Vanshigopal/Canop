import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { MD3 } from '@/config/theme';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text';
export type ButtonSize = 'small' | 'medium' | 'large';

interface Props {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'filled',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
}: Props) {
  const isInteractive = !disabled && !loading;

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      android_ripple={
        isInteractive ? { color: 'rgba(0,0,0,0.1)', borderless: false } : undefined
      }
      style={({ pressed }) => [
        styles.base,
        styles[size],
        variantStyles[variant].container,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        pressed && variantStyles[variant].pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles[variant].label.color} size="small" />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={[styles.labelBase, sizeText[size], variantStyles[variant].label]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: MD3.shape.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  small: { paddingHorizontal: 16, paddingVertical: 8, minHeight: 36 },
  medium: { paddingHorizontal: 24, paddingVertical: 10, minHeight: 48 },
  large: { paddingHorizontal: 32, paddingVertical: 14, minHeight: 56 },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.38 },
  content: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 8 },
  labelBase: { textAlign: 'center' },
});

const sizeText: Record<ButtonSize, TextStyle> = {
  small: MD3.typography.labelMedium,
  medium: MD3.typography.labelLarge,
  large: MD3.typography.titleMedium,
};

const variantStyles: Record<
  ButtonVariant,
  { container: ViewStyle; pressed: ViewStyle; label: TextStyle }
> = {
  filled: {
    container: { backgroundColor: MD3.colors.primary },
    pressed: { backgroundColor: '#3B33C7' },
    label: { color: MD3.colors.onPrimary },
  },
  tonal: {
    container: { backgroundColor: MD3.colors.primaryContainer },
    pressed: { backgroundColor: '#C9C8FF' },
    label: { color: MD3.colors.onPrimaryContainer },
  },
  outlined: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: MD3.colors.outline,
    },
    pressed: { backgroundColor: 'rgba(79,70,229,0.08)' },
    label: { color: MD3.colors.primary },
  },
  text: {
    container: { backgroundColor: 'transparent' },
    pressed: { backgroundColor: 'rgba(79,70,229,0.08)' },
    label: { color: MD3.colors.primary },
  },
};
