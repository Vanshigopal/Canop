import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Parent } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { SecureStorage } from '@/auth/SecureStorage';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { CalendarView, type AttendanceDay } from '@/components/attendance/CalendarView';
import { AttendanceCard } from '@/components/attendance/AttendanceCard';
import { Skeleton } from '@/components/ui/Skeleton';

interface AttendanceData {
  bySubject: Array<{
    subjectId: string;
    subjectName: string;
    presentCount: number;
    totalCount: number;
  }>;
  calendar: AttendanceDay[];
  overallPercent: number;
}

export function AttendanceScreen() {
  const [childId, setChildId] = useState<string | null>(null);

  useEffect(() => {
    SecureStorage.getSelectedChildId().then(setChildId);
  }, []);

  const { data, isLoading } = useApiQuery<AttendanceData>(
    ['parent-attendance', childId],
    () => Parent.attendance(childId!),
    { enabled: Boolean(childId) },
  );

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Attendance"
        subtitle={data ? `Overall ${data.overallPercent}%` : undefined}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading || !data ? (
          <Skeleton height={300} borderRadius={MD3.shape.large} />
        ) : (
          <>
            <View style={styles.calendarCard}>
              <CalendarView month={new Date()} days={data.calendar} />
            </View>
            <Text style={styles.sectionTitle}>By subject</Text>
            {data.bySubject.map((s) => (
              <AttendanceCard
                key={s.subjectId}
                subject={s.subjectName}
                presentCount={s.presentCount}
                totalCount={s.totalCount}
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
  calendarCard: {
    backgroundColor: MD3.colors.surface,
    borderRadius: MD3.shape.large,
    padding: MD3.spacing.md,
    marginBottom: MD3.spacing.lg,
    ...MD3.elevation.level1,
  },
  sectionTitle: {
    ...MD3.typography.titleMedium,
    color: MD3.colors.onSurface,
    marginBottom: MD3.spacing.sm,
  },
});
