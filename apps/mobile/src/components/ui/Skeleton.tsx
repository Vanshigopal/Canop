import React, { useEffect, useRef } from 'react';
import { Animated, type DimensionValue, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { MD3 } from '@/config/theme';

interface Props {
  width?: DimensionValue;
  height?: number;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}

export function Skeleton({ width = '100%', height = 16, style, borderRadius = MD3.shape.small }: Props) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: MD3.colors.surfaceVariant },
});
