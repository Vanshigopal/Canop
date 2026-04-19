import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MD3 } from '@/config/theme';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  helperText?: string;
  errorText?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextField({
  label,
  helperText,
  errorText,
  containerStyle,
  ...inputProps
}: Props) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(errorText);

  const borderColor = hasError
    ? MD3.colors.error
    : focused
    ? MD3.colors.primary
    : MD3.colors.outline;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text
        style={[
          styles.label,
          { color: hasError ? MD3.colors.error : focused ? MD3.colors.primary : MD3.colors.onSurfaceVariant },
        ]}
      >
        {label}
      </Text>
      <TextInput
        {...inputProps}
        onFocus={(e) => {
          setFocused(true);
          inputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          inputProps.onBlur?.(e);
        }}
        placeholderTextColor={MD3.colors.onSurfaceVariant}
        style={[
          styles.input,
          { borderColor, borderWidth: focused || hasError ? 2 : 1 },
        ]}
      />
      {(helperText || errorText) && (
        <Text style={[styles.helper, { color: hasError ? MD3.colors.error : MD3.colors.onSurfaceVariant }]}>
          {errorText ?? helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: MD3.spacing.md },
  label: {
    ...MD3.typography.labelMedium,
    marginBottom: 4,
  },
  input: {
    minHeight: 48,
    borderRadius: MD3.shape.small,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: MD3.colors.onSurface,
    backgroundColor: MD3.colors.surface,
  },
  helper: {
    ...MD3.typography.bodySmall,
    marginTop: 4,
  },
});
