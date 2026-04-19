import React, { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Parent } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { useAuth } from '@/auth/AuthContext';
import { SecureStorage } from '@/auth/SecureStorage';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatIndianCurrency } from '@/utils/indianNumbers';
import { attendanceSeverity, SEVERITY_COLORS } from '@/utils/severity';
import { formatRelativeDate } from '@/utils/dateFormat';

interface Child {
  id: string;
  name: string;
  rollNumber: string;
  classStandard: string;
  batchName: string;
  avatarUrl: string | null;
}

interface ChildSnapshot {
  attendancePercent: number;
  todayStatus: string | null;
  pendingFees: number;
  nextDueDate: string | null;
  upcomingExam?: { name: string; date: string };
  recentMarks?: { examName: string; percentage: number };
}

export function DashboardScreen() {
  const { user } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data: children, isLoading: childrenLoading } = useApiQuery<Child[]>(
    ['parent-children'],
    () => Parent.children(),
  );

  useEffect(() => {
    (async () => {
      const stored = await SecureStorage.getSelectedChildId();
      if (stored) setSelectedChildId(stored);
    })();
  }, []);

  useEffect(() => {
    if (!selectedChildId && children && children.length > 0) {
      setSelectedChildId(children[0]?.id ?? null);
    }
  }, [children, selectedChildId]);

  const { data: snapshot, isLoading: snapshotLoading, refetch, isRefetching } =
    useApiQuery<ChildSnapshot>(
      ['parent-snapshot', selectedChildId],
      () => Parent.dashboard(selectedChildId!),
      { enabled: Boolean(selectedChildId) },
    );

  async function handleSelect(id: string) {
    setSelectedChildId(id);
    await SecureStorage.setSelectedChildId(id);
  }

  const selected = children?.find((c) => c.id === selectedChildId);
  const sev = snapshot ? attendanceSeverity(snapshot.attendancePercent) : 'neutral';

  return (
    <View style={styles.container}>
      <TopAppBar title="Hello" subtitle={user?.name ?? ''} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Child switcher */}
        {childrenLoading || !children ? (
          <Skeleton height={88} borderRadius={MD3.shape.large} style={{ marginBottom: 12 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.switcherRow}
          >
            {children.map((child) => (
              <Pressable
                key={child.id}
                onPress={() => handleSelect(child.id)}
                android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: false }}
                style={[
                  styles.childChip,
                  child.id === selectedChildId && styles.childChipActive,
                ]}
              >
                <View style={styles.childAvatar}>
                  <Text style={styles.childAvatarText}>{child.name[0]?.toUpperCase()}</Text>
                </View>
                <Text style={styles.childName} numberOfLines={1}>
                  {child.name.split(' ')[0]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {selected ? (
          <Text style={styles.childContext}>
            {selected.name} \u00B7 {selected.classStandard} \u00B7 {selected.batchName}
          </Text>
        ) : null}

        {snapshotLoading || !snapshot ? (
          <Skeleton height={400} borderRadius={MD3.shape.large} style={{ marginTop: 12 }} />
        ) : (
          <>
            <Card style={styles.heroCard}>
              <Text style={styles.heroLabel}>Attendance</Text>
              <Text
                style={[
                  styles.heroValue,
                  { color: SEVERITY_COLORS[sev].text },
                ]}
              >
                {snapshot.attendancePercent}%
              </Text>
              {snapshot.todayStatus ? (
                <Badge label={`Today: ${snapshot.todayStatus}`} color={sev} />
              ) : null}
            </Card>

            {snapshot.pendingFees > 0 ? (
              <Card style={[styles.feeCard, { borderLeftWidth: 4, borderLeftColor: MD3.colors.tertiary }]}>
                <Text style={styles.cardLabel}>Fees pending</Text>
                <Text style={styles.feeAmount}>
                  {formatIndianCurrency(snapshot.pendingFees)}
                </Text>
                {snapshot.nextDueDate ? (
                  <Text style={styles.dueDate}>
                    Due {formatRelativeDate(snapshot.nextDueDate)}
                  </Text>
                ) : null}
              </Card>
            ) : null}

            {snapshot.upcomingExam ? (
              <Card style={styles.examCard}>
                <Text style={styles.cardLabel}>Upcoming exam</Text>
                <Text style={styles.examName}>{snapshot.upcomingExam.name}</Text>
                <Text style={styles.dueDate}>
                  {formatRelativeDate(snapshot.upcomingExam.date)}
                </Text>
              </Card>
            ) : null}

            {snapshot.recentMarks ? (
              <Card style={styles.marksCard}>
                <Text style={styles.cardLabel}>Latest result</Text>
                <Text style={styles.examName}>{snapshot.recentMarks.examName}</Text>
                <Text style={styles.marksValue}>{snapshot.recentMarks.percentage}%</Text>
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  content: { padding: MD3.spacing.md, paddingBottom: 100 },
  switcherRow: { paddingVertical: MD3.spacing.sm, gap: 8 },
  childChip: {
    width: 80,
    alignItems: 'center',
    padding: 8,
    borderRadius: MD3.shape.medium,
    backgroundColor: MD3.colors.surface,
    borderWidth: 1,
    borderColor: MD3.colors.outlineVariant,
    marginRight: 8,
  },
  childChipActive: {
    backgroundColor: MD3.colors.primaryContainer,
    borderColor: MD3.colors.primary,
  },
  childAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MD3.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  childAvatarText: { ...MD3.typography.titleMedium, color: MD3.colors.onPrimary },
  childName: { ...MD3.typography.labelSmall, color: MD3.colors.onSurface, textAlign: 'center' },
  childContext: {
    ...MD3.typography.bodySmall,
    color: MD3.colors.onSurfaceVariant,
    marginVertical: MD3.spacing.sm,
  },
  heroCard: { marginBottom: MD3.spacing.sm },
  heroLabel: {
    ...MD3.typography.labelSmall,
    color: MD3.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroValue: { ...MD3.typography.displayMedium, marginVertical: 4 },
  cardLabel: {
    ...MD3.typography.labelSmall,
    color: MD3.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  feeCard: { marginBottom: MD3.spacing.sm },
  feeAmount: { ...MD3.typography.headlineSmall, color: MD3.colors.onSurface, marginTop: 4 },
  dueDate: { ...MD3.typography.bodySmall, color: MD3.colors.warning, marginTop: 2 },
  examCard: { marginBottom: MD3.spacing.sm },
  examName: { ...MD3.typography.titleMedium, color: MD3.colors.onSurface, marginTop: 4 },
  marksCard: { marginBottom: MD3.spacing.sm },
  marksValue: {
    ...MD3.typography.headlineSmall,
    color: MD3.colors.success,
    marginTop: 4,
  },
});
