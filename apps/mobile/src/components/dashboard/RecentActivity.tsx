import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { MD3 } from '@/config/theme';
import { formatRelativeDate } from '@/utils/dateFormat';

export interface ActivityItem {
  id: string;
  title: string;
  subtitle?: string;
  timestamp: string;
}

interface Props {
  items: ActivityItem[];
  emptyText?: string;
}

export function RecentActivity({ items, emptyText = 'No recent activity' }: Props) {
  if (items.length === 0) {
    return <Text style={styles.empty}>{emptyText}</Text>;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.dot} />
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            {item.subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            ) : null}
            <Text style={styles.timestamp}>{formatRelativeDate(item.timestamp)}</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: MD3.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MD3.colors.outlineVariant,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MD3.colors.primary,
    marginTop: 8,
    marginRight: 12,
  },
  body: { flex: 1 },
  title: { ...MD3.typography.bodyMedium, color: MD3.colors.onSurface },
  subtitle: {
    ...MD3.typography.bodySmall,
    color: MD3.colors.onSurfaceVariant,
    marginTop: 2,
  },
  timestamp: {
    ...MD3.typography.labelSmall,
    color: MD3.colors.onSurfaceVariant,
    marginTop: 2,
  },
  empty: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: MD3.spacing.lg,
  },
});
