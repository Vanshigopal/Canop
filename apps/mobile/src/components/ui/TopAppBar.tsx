import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MD3 } from '@/config/theme';

interface Props {
  title: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onLeadingPress?: () => void;
  subtitle?: string;
}

export function TopAppBar({ title, leading, trailing, onLeadingPress, subtitle }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {leading ? (
        <Pressable
          onPress={onLeadingPress}
          android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: true, radius: 24 }}
          style={styles.iconSlot}
        >
          {leading}
        </Pressable>
      ) : (
        <View style={styles.iconSlot} />
      )}

      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.iconSlot}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MD3.colors.surface,
    paddingHorizontal: 4,
    paddingBottom: 8,
    minHeight: 64,
  },
  iconSlot: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: { flex: 1, paddingHorizontal: 8 },
  title: {
    ...MD3.typography.titleLarge,
    color: MD3.colors.onSurface,
  },
  subtitle: {
    ...MD3.typography.bodySmall,
    color: MD3.colors.onSurfaceVariant,
    marginTop: 2,
  },
});
