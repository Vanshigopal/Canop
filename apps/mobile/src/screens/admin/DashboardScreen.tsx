import React from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { Admin } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { useAuth } from '@/auth/AuthContext';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCompactIndian } from '@/utils/indianNumbers';

interface AdminDashboard {
  totalStudents: number;
  newAdmissionsThisMonth: number;
  todayAttendancePercent: number;
  collectedThisMonth: number;
  pendingFees: number;
  activeBatches: number;
  upcomingExams: number;
  unreadNotifications: number;
}

export function DashboardScreen() {
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useApiQuery<AdminDashboard>(
    ['admin-dashboard'],
    () => Admin.dashboard(),
  );

  return (
    <View style={styles.container}>
      <TopAppBar title="Admin" subtitle={user?.name ?? ''} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading || !data ? (
          <Skeleton height={400} borderRadius={MD3.shape.large} />
        ) : (
          <>
            <Text style={styles.heading}>Today</Text>
            <View style={styles.grid}>
              <View style={styles.col}>
                <MetricCard
                  label="Students"
                  value={String(data.totalStudents)}
                  trend={{
                    delta: `+${data.newAdmissionsThisMonth} this month`,
                    direction: 'up',
                  }}
                  accent={MD3.colors.primary}
                />
              </View>
              <View style={styles.col}>
                <MetricCard
                  label="Attendance"
                  value={`${data.todayAttendancePercent}%`}
                  accent={MD3.colors.success}
                />
              </View>
              <View style={styles.col}>
                <MetricCard
                  label="Collected"
                  value={`\u20B9${formatCompactIndian(data.collectedThisMonth)}`}
                  accent={MD3.colors.tertiary}
                />
              </View>
              <View style={styles.col}>
                <MetricCard
                  label="Pending fees"
                  value={`\u20B9${formatCompactIndian(data.pendingFees)}`}
                  accent={MD3.colors.warning}
                />
              </View>
            </View>

            <Text style={styles.heading}>Operations</Text>
            <View style={styles.grid}>
              <View style={styles.col}>
                <MetricCard label="Batches" value={String(data.activeBatches)} />
              </View>
              <View style={styles.col}>
                <MetricCard label="Upcoming exams" value={String(data.upcomingExams)} />
              </View>
              <View style={styles.col}>
                <MetricCard
                  label="Unread alerts"
                  value={String(data.unreadNotifications)}
                  accent={MD3.colors.error}
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  content: { padding: MD3.spacing.md, paddingBottom: 100 },
  heading: {
    ...MD3.typography.titleMedium,
    color: MD3.colors.onSurface,
    marginTop: MD3.spacing.md,
    marginBottom: MD3.spacing.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  col: { flexBasis: '48%', flexGrow: 1 },
});
