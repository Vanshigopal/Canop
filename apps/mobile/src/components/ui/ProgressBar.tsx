import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MD3 } from '@/config/theme';

interface Props {
  value: number; // 0..100
  color?: string;
  trackColor?: string;
  height?: number;
}

export function ProgressBar({
  value,
  color = MD3.colors.primary,
  trackColor = MD3.colors.surfaceVariant,
  height = 6,
}: Props) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View style={[styles.track, { backgroundColor: trackColor, height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: color,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
