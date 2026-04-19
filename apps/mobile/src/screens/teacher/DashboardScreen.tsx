import React from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Teacher } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { useAuth } from '@/auth/AuthContext';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity, type ActivityItem } from '@/components/dashboard/RecentActivity';
import { Skeleton } from '@/components/ui/Skeleton';

interface TeacherDashboard {
  todaysSessions: number;
  pendingMarksEntries: number;
  unreadMessages: number;
  totalStudents: number;
  recentActivity: ActivityItem[];
}

export function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { data, isLoading, refetch, isRefetching } = useApiQuery<TeacherDashboard>(
    ['teacher-dashboard'],
    () => Teacher.dashboard(),
  );

  const quickActions = [
    {
      id: 'mark',
      label: 'Mark attendance',
      icon: '\u2713',
      onPress: () => navigation.navigate('Attendance' as never),
      tint: MD3.colors.primaryContainer,
    },
    {
      id: 'grades',
      label: 'Enter marks',
      icon: '\u270D',
      onPress: () => navigation.navigate('Exams' as never),
      tint: MD3.colors.secondaryContainer,
    },
    {
      id: 'broadcast',
      label: 'Send notice',
      icon: '\u2709',
      onPress: () => navigation.navigate('Inbox' as never),
      tint: MD3.colors.tertiaryContainer,
    },
  ];

  return (
    <View style={styles.container}>
      <TopAppBar title="Dashboard" subtitle={user?.name ?? ''} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading || !data ? (
          <Skeleton height={400} borderRadius={MD3.shape.large} />
        ) : (
          <>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCol}>
                <MetricCard
                  label="Today"
                  value={String(data.todaysSessions)}
                  accent={MD3.colors.primary}
                />
              </View>
              <View style={styles.metricCol}>
                <MetricCard
                  label="Pending marks"
                  value={String(data.pendingMarksEntries)}
                  accent={MD3.colors.warning}
                />
              </View>
              <View style={styles.metricCol}>
                <MetricCard
                  label="Students"
                  value={String(data.totalStudents)}
                  accent={MD3.colors.secondary}
                />
              </View>
              <View style={styles.metricCol}>
                <MetricCard
                  label="Unread"
                  value={String(data.unreadMessages)}
                  accent={MD3.colors.tertiary}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Quick actions</Text>
            <QuickActions actions={quickActions} />

            <Text style={styles.sectionTitle}>Recent activity</Text>
            <RecentActivity items={data.recentActivity} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  content: { padding: MD3.spacing.md, paddingBottom: 100 },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: MD3.spacing.md,
  },
  metricCol: { flexBasis: '48%', flexGrow: 1 },
  sectionTitle: {
    ...MD3.typography.titleMedium,
    color: MD3.colors.onSurface,
    marginTop: MD3.spacing.lg,
    marginBottom: MD3.spacing.sm,
  },
});
