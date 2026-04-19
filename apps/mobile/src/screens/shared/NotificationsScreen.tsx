import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Notifications } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRelativeDate } from '@/utils/dateFormat';

interface Notification {
  id: string;
  title: string;
  body: string;
  category: string;
  read: boolean;
  createdAt: string;
}

export function NotificationsScreen() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useApiQuery<Notification[]>(
    ['notifications'],
    () => Notifications.list(),
  );

  async function handleMarkAllRead() {
    await Notifications.markAllRead();
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  async function handlePress(id: string) {
    await Notifications.markRead(id);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Notifications"
        trailing={
          <Pressable
            onPress={handleMarkAllRead}
            android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true, radius: 24 }}
            style={styles.iconButton}
          >
            <Text style={styles.iconText}>\u2713</Text>
          </Pressable>
        }
      />
      {isLoading || !data ? (
        <View style={{ padding: MD3.spacing.md }}>
          <Skeleton height={70} borderRadius={MD3.shape.medium} style={{ marginBottom: 8 }} />
          <Skeleton height={70} borderRadius={MD3.shape.medium} style={{ marginBottom: 8 }} />
          <Skeleton height={70} borderRadius={MD3.shape.medium} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePress(item.id)}
              android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: false }}
              style={[styles.row, !item.read && styles.unread]}
            >
              <View style={styles.body}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.preview} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={styles.timestamp}>
                  {formatRelativeDate(item.createdAt)}
                </Text>
              </View>
              {!item.read ? <View style={styles.dot} /> : null}
            </Pressable>
          )}
          ListEmptyComponent={() => (
            <Text style={styles.empty}>You&apos;re all caught up</Text>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  content: { paddingBottom: 100 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 18, color: MD3.colors.onSurface },
  row: {
    flexDirection: 'row',
    paddingHorizontal: MD3.spacing.md,
    paddingVertical: MD3.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MD3.colors.outlineVariant,
    backgroundColor: MD3.colors.surface,
  },
  unread: { backgroundColor: MD3.colors.surfaceVariant },
  body: { flex: 1 },
  title: { ...MD3.typography.titleSmall, color: MD3.colors.onSurface },
  preview: {
    ...MD3.typography.bodySmall,
    color: MD3.colors.onSurfaceVariant,
    marginTop: 2,
  },
  timestamp: {
    ...MD3.typography.labelSmall,
    color: MD3.colors.onSurfaceVariant,
    marginTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: MD3.colors.primary,
    marginLeft: 8,
    marginTop: 8,
  },
  empty: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: MD3.spacing.xxl,
  },
});
