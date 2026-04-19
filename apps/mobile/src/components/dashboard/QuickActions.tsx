import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { MD3 } from '@/config/theme';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
  tint?: string;
}

interface Props {
  actions: QuickAction[];
}

export function QuickActions({ actions }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {actions.map((action) => (
        <Pressable
          key={action.id}
          onPress={action.onPress}
          android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: false }}
          style={styles.tile}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: action.tint ?? MD3.colors.primaryContainer },
            ]}
          >
            <Text style={styles.iconText}>{action.icon}</Text>
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: MD3.spacing.sm, paddingRight: MD3.spacing.md },
  tile: {
    width: 80,
    alignItems: 'center',
    marginRight: MD3.spacing.md,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: MD3.spacing.xs,
  },
  iconText: {
    fontSize: 24,
  },
  label: {
    ...MD3.typography.labelSmall,
    color: MD3.colors.onSurface,
    textAlign: 'center',
  },
});
