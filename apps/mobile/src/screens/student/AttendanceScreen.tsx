import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { Student } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { AttendanceCard } from '@/components/attendance/AttendanceCard';
import { CalendarView, type AttendanceDay } from '@/components/attendance/CalendarView';
import { Skeleton } from '@/components/ui/Skeleton';

interface AttendanceData {
  bySubject: Array<{
    subjectId: string;
    subjectName: string;
    presentCount: number;
    totalCount: number;
    lastSession?: string;
  }>;
  calendar: AttendanceDay[];
  overallPercent: number;
}

export function AttendanceScreen() {
  const [month] = useState(new Date());
  const { data, isLoading, refetch, isRefetching } = useApiQuery<AttendanceData>(
    ['student-attendance'],
    () => Student.attendance(),
  );

  return (
    <View style={styles.container}>
      <TopAppBar title="Attendance" subtitle={`Overall ${data?.overallPercent ?? '\u2014'}%`} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading || !data ? (
          <>
            <Skeleton height={240} borderRadius={MD3.shape.large} style={{ marginBottom: 16 }} />
            <Skeleton height={120} borderRadius={MD3.shape.large} style={{ marginBottom: 12 }} />
            <Skeleton height={120} borderRadius={MD3.shape.large} />
          </>
        ) : (
          <>
            <View style={styles.calendarCard}>
              <CalendarView month={month} days={data.calendar} />
            </View>

            <Text style={styles.sectionTitle}>By subject</Text>
            {data.bySubject.length === 0 ? (
              <Text style={styles.empty}>No subjects enrolled</Text>
            ) : (
              data.bySubject.map((s) => (
                <AttendanceCard
                  key={s.subjectId}
                  subject={s.subjectName}
                  presentCount={s.presentCount}
                  totalCount={s.totalCount}
                  lastSession={s.lastSession}
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
  empty: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: MD3.spacing.lg,
  },
});
