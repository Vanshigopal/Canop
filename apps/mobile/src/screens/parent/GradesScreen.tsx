import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Parent } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { SecureStorage } from '@/auth/SecureStorage';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { ResultCard } from '@/components/grades/ResultCard';
import { TrendChart } from '@/components/grades/TrendChart';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

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
  const [childId, setChildId] = useState<string | null>(null);

  useEffect(() => {
    SecureStorage.getSelectedChildId().then(setChildId);
  }, []);

  const { data, isLoading } = useApiQuery<GradesData>(
    ['parent-grades', childId],
    () => Parent.grades(childId!),
    { enabled: Boolean(childId) },
  );

  return (
    <View style={styles.container}>
      <TopAppBar title="Grades" />
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading || !data ? (
          <Skeleton height={400} borderRadius={MD3.shape.large} />
        ) : (
          <>
            <Card style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Performance trend</Text>
              <TrendChart data={data.trend} />
            </Card>

            <Text style={styles.sectionTitle}>Recent exams</Text>
            {data.recentExams.map((e) => (
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
            ))}
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
});
