import React, { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Teacher } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Skeleton } from '@/components/ui/Skeleton';
import { QRScanner } from '@/components/attendance/QRScanner';
import { Button } from '@/components/ui/Button';
import { Snackbar } from '@/components/ui/Snackbar';
import { api } from '@/api/client';

interface Session {
  id: string;
  subjectName: string;
  batchName: string;
  scheduledAt: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  presentCount: number;
  totalCount: number;
}

export function AttendanceScreen() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const { data: sessions, isLoading } = useApiQuery<Session[]>(
    ['teacher-attendance-sessions'],
    () => api.get('/attendance/sessions/today'),
  );

  if (activeSessionId) {
    return (
      <View style={styles.container}>
        <TopAppBar
          title="Scan QR"
          leading={<Text style={styles.iconText}>\u2190</Text>}
          onLeadingPress={() => setActiveSessionId(null)}
        />
        <QRScanner
          sessionId={activeSessionId}
          onSuccess={(name) => setSnack(`Marked: ${name}`)}
        />
        <Snackbar
          visible={Boolean(snack)}
          message={snack ?? ''}
          onDismiss={() => setSnack(null)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopAppBar title="Attendance" />
      {isLoading || !sessions ? (
        <View style={{ padding: MD3.spacing.md }}>
          <Skeleton height={120} borderRadius={MD3.shape.large} style={{ marginBottom: 12 }} />
          <Skeleton height={120} borderRadius={MD3.shape.large} />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Text style={styles.subject}>{item.subjectName}</Text>
              <Text style={styles.batch}>{item.batchName}</Text>

              <View style={styles.metaRow}>
                <Chip
                  label={`${item.presentCount} / ${item.totalCount}`}
                  selected
                />
                <Text style={styles.scheduled}>
                  {new Date(item.scheduledAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              <View style={styles.actions}>
                <Button
                  label="Scan QR"
                  onPress={() => setActiveSessionId(item.id)}
                  size="small"
                />
                <Button
                  label="Manual"
                  variant="outlined"
                  size="small"
                  onPress={() =>
                    Alert.alert('Manual marking', 'Open the web app for bulk roster marking')
                  }
                />
              </View>
            </Card>
          )}
          ListEmptyComponent={() => (
            <Text style={styles.empty}>No sessions today</Text>
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
  subject: { ...MD3.typography.titleMedium, color: MD3.colors.onSurface },
  batch: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: MD3.spacing.sm,
  },
  scheduled: { ...MD3.typography.labelMedium, color: MD3.colors.onSurfaceVariant },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: MD3.spacing.md,
  },
  empty: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: MD3.spacing.xxl,
  },
  iconText: { fontSize: 18, color: MD3.colors.onSurface },
});
