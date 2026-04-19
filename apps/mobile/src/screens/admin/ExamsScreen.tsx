import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Admin } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/utils/dateFormat';

interface Exam {
  id: string;
  name: string;
  examDate: string;
  status: string;
  subjectName: string;
}

export function ExamsScreen() {
  const { data, isLoading } = useApiQuery<Exam[]>(['admin-exams'], () =>
    Admin.exams(),
  );

  return (
    <View style={styles.container}>
      <TopAppBar title="Exams" />
      {isLoading || !data ? (
        <View style={{ padding: MD3.spacing.md }}>
          <Skeleton height={120} borderRadius={MD3.shape.large} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.subject}>{item.subjectName}</Text>
                  <Text style={styles.date}>{formatDate(item.examDate)}</Text>
                </View>
                <Badge label={item.status} />
              </View>
            </Card>
          )}
          ListEmptyComponent={() => <Text style={styles.empty}>No exams</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  content: { padding: MD3.spacing.md, paddingBottom: 100 },
  card: { marginBottom: MD3.spacing.sm },
  row: { flexDirection: 'row' },
  name: { ...MD3.typography.titleMedium, color: MD3.colors.onSurface },
  subject: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant },
  date: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant, marginTop: 2 },
  empty: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: MD3.spacing.xxl,
  },
});
