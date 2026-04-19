import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Admin } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRelativeDate } from '@/utils/dateFormat';

interface Broadcast {
  id: string;
  title: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
  channel: 'SMS' | 'EMAIL' | 'PUSH' | 'WHATSAPP';
  recipientCount: number;
  sentAt: string | null;
}

export function CommunicationsScreen() {
  const { data, isLoading } = useApiQuery<Broadcast[]>(
    ['admin-broadcasts'],
    () => Admin.broadcasts(),
  );

  return (
    <View style={styles.container}>
      <TopAppBar title="Communications" />
      {isLoading || !data ? (
        <View style={{ padding: MD3.spacing.md }}>
          <Skeleton height={100} borderRadius={MD3.shape.large} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.meta}>
                    {item.channel} \u00B7 {item.recipientCount} recipients
                  </Text>
                </View>
                <Badge
                  label={item.status}
                  color={
                    item.status === 'SENT'
                      ? 'excellent'
                      : item.status === 'SCHEDULED'
                      ? 'good'
                      : item.status === 'FAILED'
                      ? 'critical'
                      : 'neutral'
                  }
                />
              </View>
              {item.sentAt ? (
                <Text style={styles.timestamp}>Sent {formatRelativeDate(item.sentAt)}</Text>
              ) : null}
            </Card>
          )}
          ListEmptyComponent={() => (
            <Text style={styles.empty}>No broadcasts yet</Text>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  content: { padding: MD3.spacing.md, paddingBottom: 100 },
  card: { marginBottom: MD3.spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { ...MD3.typography.titleMedium, color: MD3.colors.onSurface },
  meta: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant, marginTop: 2 },
  timestamp: {
    ...MD3.typography.labelSmall,
    color: MD3.colors.onSurfaceVariant,
    marginTop: MD3.spacing.xs,
  },
  empty: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: MD3.spacing.xxl,
  },
});
