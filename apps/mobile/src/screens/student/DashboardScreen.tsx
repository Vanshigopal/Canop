import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Student } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { useAuth } from '@/auth/AuthContext';
import { useSocket } from '@/hooks/useSocket';

import { MD3 } from '@/config/theme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { TopAppBar } from '@/components/ui/TopAppBar';

import { formatIndianCurrency } from '@/utils/indianNumbers';
import { formatRelativeDate } from '@/utils/dateFormat';
import { attendanceSeverity, SEVERITY_COLORS } from '@/utils/severity';

type Nav = NativeStackNavigationProp<Record<string, undefined>>;

interface DashboardData {
  todayAttendance?: { subjectName: string; status: string };
  weekAttendancePct: number | null;
  pendingFees: {
    installmentCount: number;
    totalAmount: number;
    nearestDueDate: string | null;
  };
  upcomingAssignments: Array<{
    id: string;
    title: string;
    subjectName: string;
    deadline: string;
    status: string;
  }>;
  recentResults: Array<{
    examId: string;
    examName: string;
    subjectName: string;
    percentage: number;
    grade: string;
    batchRank: number;
    trendDirection: 'up' | 'down' | 'flat';
  }>;
}

export function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useApiQuery<DashboardData>(
    ['student-dashboard'],
    () => Student.dashboard(),
  );

  useSocket({
    'attendance:marked': () =>
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] }),
    'payment:received': () =>
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] }),
    'marks:published': () =>
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] }),
    'notification:new': () =>
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] }),
  });

  const greeting = getGreeting();
  const firstName = user?.name?.split(' ')[0] ?? '';

  if (isLoading || !data) return <DashboardSkeleton />;

  const weekPctSeverity =
    data.weekAttendancePct !== null
      ? attendanceSeverity(data.weekAttendancePct)
      : 'neutral';

  return (
    <View style={styles.container}>
      <TopAppBar title="Canop" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.name}>{firstName}</Text>

        {/* Today's attendance */}
        <Card style={styles.section}>
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.label}>Today&apos;s class</Text>
              <Text style={styles.subText}>
                {data.todayAttendance?.subjectName ?? 'No class today'}
              </Text>
            </View>
            {data.todayAttendance ? (
              <Badge label={data.todayAttendance.status} color={weekPctSeverity} />
            ) : null}
          </View>
          <Text
            style={[
              styles.bigNumber,
              { color: SEVERITY_COLORS[weekPctSeverity].text },
            ]}
          >
            {data.weekAttendancePct !== null ? `${data.weekAttendancePct}%` : '\u2014'}
          </Text>
          <Text style={styles.footnote}>This week&apos;s attendance</Text>
        </Card>

        {/* Pending fees */}
        {data.pendingFees.installmentCount > 0 ? (
          <Card style={[styles.section, { borderLeftWidth: 4, borderLeftColor: MD3.colors.tertiary }]}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Fees pending</Text>
                <Text style={styles.feeAmount}>
                  {formatIndianCurrency(data.pendingFees.totalAmount)}
                </Text>
                {data.pendingFees.nearestDueDate ? (
                  <Text style={styles.dueDate}>
                    Due {formatRelativeDate(data.pendingFees.nearestDueDate)}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.payButton}
                onPress={() => navigation.navigate('Fees' as never)}
                activeOpacity={0.85}
              >
                <Text style={styles.payButtonText}>Pay now</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ) : null}

        {/* Upcoming assignments */}
        {data.upcomingAssignments.length > 0 ? (
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionTitle}>Due soon</Text>
            {data.upcomingAssignments.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={styles.assignmentRow}
                onPress={() => navigation.navigate('Assignments' as never)}
                activeOpacity={0.6}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.assignmentTitle}>{a.title}</Text>
                  <Text style={styles.assignmentMeta}>
                    {a.subjectName} \u00B7 {formatRelativeDate(a.deadline)}
                  </Text>
                </View>
                <Badge label={a.status.replace('_', ' ')} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Recent results */}
        {data.recentResults.length > 0 ? (
          <View style={styles.sectionGroup}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest results</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Grades' as never)}>
                <Text style={styles.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>
            {data.recentResults.map((r) => (
              <Card key={r.examId} style={styles.section}>
                <Text style={styles.examName}>{r.examName}</Text>
                <Text style={styles.subText}>{r.subjectName}</Text>
                <View style={styles.resultRow}>
                  <Text style={styles.bigNumber}>{r.percentage}%</Text>
                  <Badge
                    label={r.grade}
                    color={
                      r.trendDirection === 'up'
                        ? 'excellent'
                        : r.trendDirection === 'down'
                        ? 'critical'
                        : 'neutral'
                    }
                  />
                  <Text style={styles.rank}>Rank #{r.batchRank}</Text>
                </View>
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function DashboardSkeleton() {
  return (
    <View style={[styles.container, { padding: MD3.spacing.md }]}>
      <Skeleton width={120} height={16} style={{ marginBottom: 4 }} />
      <Skeleton width={180} height={28} style={{ marginBottom: 16 }} />
      <Skeleton width="100%" height={140} borderRadius={MD3.shape.large} style={{ marginBottom: 12 }} />
      <Skeleton width="100%" height={100} borderRadius={MD3.shape.large} style={{ marginBottom: 12 }} />
      <Skeleton width="100%" height={80} borderRadius={MD3.shape.large} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  content: { padding: MD3.spacing.md, paddingBottom: 100 },
  greeting: { ...MD3.typography.bodyMedium, color: MD3.colors.onSurfaceVariant },
  name: {
    ...MD3.typography.headlineLarge,
    color: MD3.colors.onSurface,
    marginBottom: MD3.spacing.md,
  },
  section: { marginBottom: MD3.spacing.sm },
  sectionGroup: { marginTop: MD3.spacing.lg },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: {
    ...MD3.typography.labelSmall,
    color: MD3.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subText: { ...MD3.typography.bodyMedium, color: MD3.colors.onSurface, marginTop: 2 },
  bigNumber: { ...MD3.typography.displayMedium, marginTop: MD3.spacing.xs },
  footnote: {
    ...MD3.typography.bodySmall,
    color: MD3.colors.onSurfaceVariant,
    marginTop: 2,
  },
  feeAmount: { ...MD3.typography.titleLarge, color: MD3.colors.onSurface, marginTop: 4 },
  dueDate: { ...MD3.typography.bodySmall, color: MD3.colors.warning, marginTop: 2 },
  payButton: {
    backgroundColor: MD3.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: MD3.shape.full,
    alignSelf: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  payButtonText: { ...MD3.typography.labelLarge, color: MD3.colors.onPrimary },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MD3.spacing.sm,
  },
  sectionTitle: { ...MD3.typography.titleMedium, color: MD3.colors.onSurface },
  viewAll: { ...MD3.typography.labelMedium, color: MD3.colors.primary },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MD3.colors.outlineVariant,
  },
  assignmentTitle: { ...MD3.typography.bodyLarge, color: MD3.colors.onSurface },
  assignmentMeta: {
    ...MD3.typography.bodySmall,
    color: MD3.colors.onSurfaceVariant,
    marginTop: 2,
  },
  examName: { ...MD3.typography.titleSmall, color: MD3.colors.onSurface },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginTop: MD3.spacing.xs,
  },
  rank: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant },
});
