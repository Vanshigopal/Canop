import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Pressable } from 'react-native';
import { MD3 } from '@/config/theme';

interface Props {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onActionPress?: () => void;
  onDismiss: () => void;
  duration?: number;
}

export function Snackbar({
  visible,
  message,
  actionLabel,
  onActionPress,
  onDismiss,
  duration = 4000,
}: Props) {
  const translateY = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(translateY, { toValue: 80, duration: 200, useNativeDriver: true }).start(
          () => onDismiss(),
        );
      }, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visible, translateY, onDismiss, duration]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <View style={styles.content}>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        {actionLabel && onActionPress ? (
          <Pressable onPress={onActionPress} android_ripple={{ color: 'rgba(255,255,255,0.18)' }}>
            <Text style={styles.actionLabel}>{actionLabel.toUpperCase()}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: MD3.colors.onSurface,
    borderRadius: MD3.shape.small,
    ...MD3.elevation.level3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  message: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.surface,
    flex: 1,
  },
  actionLabel: {
    ...MD3.typography.labelLarge,
    color: '#A4A0FF',
    marginLeft: 16,
  },
});
