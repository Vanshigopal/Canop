import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useApiQuery } from '@/hooks/useApi';
import { api } from '@/api/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/utils/dateFormat';

interface Exam {
  id: string;
  name: string;
  subjectName: string;
  examDate: string;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'COMPLETED';
  marksEntered: number;
  totalStudents: number;
}

export function ExamsScreen() {
  const { data, isLoading } = useApiQuery<Exam[]>(['teacher-exams'], () =>
    api.get('/exams'),
  );

  return (
    <View style={styles.container}>
      <TopAppBar title="Exams" />
      {isLoading || !data ? (
        <View style={{ padding: MD3.spacing.md }}>
          <Skeleton height={120} borderRadius={MD3.shape.large} style={{ marginBottom: 12 }} />
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
                </View>
                <Badge
                  label={item.status}
                  color={
                    item.status === 'PUBLISHED'
                      ? 'excellent'
                      : item.status === 'SCHEDULED'
                      ? 'good'
                      : item.status === 'DRAFT'
                      ? 'neutral'
                      : 'warning'
                  }
                />
              </View>
              <Text style={styles.date}>{formatDate(item.examDate)}</Text>
              <Text style={styles.progress}>
                {item.marksEntered} / {item.totalStudents} marks entered
              </Text>
            </Card>
          )}
          ListEmptyComponent={() => (
            <Text style={styles.empty}>No exams scheduled</Text>
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
  subject: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant },
  date: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant, marginTop: 4 },
  progress: {
    ...MD3.typography.labelMedium,
    color: MD3.colors.primary,
    marginTop: MD3.spacing.xs,
  },
  empty: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: MD3.spacing.xxl,
  },
});
