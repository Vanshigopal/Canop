import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Student } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRelativeDate, isOverdue } from '@/utils/dateFormat';

interface Assignment {
  id: string;
  title: string;
  subjectName: string;
  deadline: string;
  status: 'PENDING' | 'SUBMITTED' | 'GRADED' | 'LATE';
  marksScored?: number;
  totalMarks?: number;
}

export function AssignmentsScreen() {
  const { data, isLoading } = useApiQuery<Assignment[]>(
    ['student-assignments'],
    () => Student.assignments(),
  );

  if (isLoading || !data) {
    return (
      <View style={styles.container}>
        <TopAppBar title="Assignments" />
        <View style={styles.loadingPad}>
          <Skeleton height={120} borderRadius={MD3.shape.large} style={{ marginBottom: 12 }} />
          <Skeleton height={120} borderRadius={MD3.shape.large} style={{ marginBottom: 12 }} />
          <Skeleton height={120} borderRadius={MD3.shape.large} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopAppBar title="Assignments" />
      <FlatList
        data={data}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.85}>
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.meta}>{item.subjectName}</Text>
                </View>
                <Badge
                  label={item.status}
                  color={
                    item.status === 'GRADED'
                      ? 'excellent'
                      : item.status === 'SUBMITTED'
                      ? 'good'
                      : item.status === 'LATE'
                      ? 'critical'
                      : 'warning'
                  }
                />
              </View>

              <Text
                style={[
                  styles.deadline,
                  item.status === 'PENDING' && isOverdue(item.deadline)
                    ? { color: MD3.colors.error }
                    : null,
                ]}
              >
                Due {formatRelativeDate(item.deadline)}
              </Text>

              {item.status === 'GRADED' && item.marksScored !== undefined ? (
                <Text style={styles.marks}>
                  Scored {item.marksScored} / {item.totalMarks}
                </Text>
              ) : null}
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => <Text style={styles.empty}>No assignments yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  content: { padding: MD3.spacing.md, paddingBottom: 100 },
  loadingPad: { padding: MD3.spacing.md },
  card: { marginBottom: MD3.spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { ...MD3.typography.titleMedium, color: MD3.colors.onSurface },
  meta: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant, marginTop: 2 },
  deadline: {
    ...MD3.typography.bodySmall,
    color: MD3.colors.onSurfaceVariant,
    marginTop: MD3.spacing.sm,
  },
  marks: {
    ...MD3.typography.titleSmall,
    color: MD3.colors.success,
    marginTop: MD3.spacing.xs,
  },
  empty: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: MD3.spacing.xxl,
  },
});
