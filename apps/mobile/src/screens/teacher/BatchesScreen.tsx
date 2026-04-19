import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Teacher } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';

interface Batch {
  id: string;
  name: string;
  classStandardName: string;
  studentCount: number;
  subjectCount: number;
  isActive: boolean;
}

export function BatchesScreen() {
  const { data, isLoading } = useApiQuery<Batch[]>(['teacher-batches'], () =>
    Teacher.batches(),
  );

  return (
    <View style={styles.container}>
      <TopAppBar title="My batches" />
      {isLoading || !data ? (
        <View style={{ padding: MD3.spacing.md }}>
          <Skeleton height={100} borderRadius={MD3.shape.large} style={{ marginBottom: 12 }} />
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
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.standard}>{item.classStandardName}</Text>
                </View>
                <Badge
                  label={item.isActive ? 'Active' : 'Inactive'}
                  color={item.isActive ? 'good' : 'neutral'}
                />
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>{item.studentCount} students</Text>
                <Text style={styles.meta}>{item.subjectCount} subjects</Text>
              </View>
            </Card>
          )}
          ListEmptyComponent={() => (
            <Text style={styles.empty}>No batches assigned</Text>
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
  name: { ...MD3.typography.titleMedium, color: MD3.colors.onSurface },
  standard: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: MD3.spacing.sm,
  },
  meta: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant },
  empty: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: MD3.spacing.xxl,
  },
});
