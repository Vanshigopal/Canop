import React from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { Student } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Card } from '@/components/ui/Card';
import { ResultCard } from '@/components/grades/ResultCard';
import { TrendChart } from '@/components/grades/TrendChart';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/api/client';

interface GradesData {
  recentExams: Array<{
    examId: string;
    examName: string;
    subject: string;
    percentage: number;
    cutOff: number;
    grade: string;
    rank: number;
    totalStudents: number;
    trend: 'up' | 'down' | 'flat';
  }>;
  trend: Array<{ label: string; value: number }>;
}

export function GradesScreen() {
  const { data, isLoading, refetch, isRefetching } = useApiQuery<GradesData>(
    ['student-grades'],
    () => api.get('/student/gradebook'),
  );

  return (
    <View style={styles.container}>
      <TopAppBar title="Grades" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading || !data ? (
          <>
            <Skeleton height={200} borderRadius={MD3.shape.large} style={{ marginBottom: 12 }} />
            <Skeleton height={120} borderRadius={MD3.shape.large} style={{ marginBottom: 12 }} />
            <Skeleton height={120} borderRadius={MD3.shape.large} />
          </>
        ) : (
          <>
            <Card style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Performance trend</Text>
              <TrendChart data={data.trend} />
            </Card>

            <Text style={styles.sectionTitle}>Recent exams</Text>
            {data.recentExams.length === 0 ? (
              <Text style={styles.empty}>No exam results yet</Text>
            ) : (
              data.recentExams.map((e) => (
                <ResultCard
                  key={e.examId}
                  examName={e.examName}
                  subject={e.subject}
                  percentage={e.percentage}
                  cutOff={e.cutOff}
                  grade={e.grade}
                  rank={e.rank}
                  totalStudents={e.totalStudents}
                  trend={e.trend}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  content: { padding: MD3.spacing.md, paddingBottom: 100 },
  chartCard: { marginBottom: MD3.spacing.lg },
  sectionTitle: {
    ...MD3.typography.titleMedium,
    color: MD3.colors.onSurface,
    marginBottom: MD3.spacing.sm,
  },
  empty: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: MD3.spacing.lg,
  },
});
