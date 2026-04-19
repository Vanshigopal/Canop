import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Student } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';

interface VideoLecture {
  id: string;
  title: string;
  subjectName: string;
  durationSeconds: number;
  thumbnailUrl: string | null;
  watchedPercent: number;
  publishedAt: string;
}

type Nav = NativeStackNavigationProp<Record<string, { videoId: string } | undefined>>;

export function VideosScreen() {
  const navigation = useNavigation<Nav>();
  const { data, isLoading } = useApiQuery<VideoLecture[]>(
    ['student-videos'],
    () => Student.videos(),
  );

  return (
    <View style={styles.container}>
      <TopAppBar title="Videos" />
      {isLoading || !data ? (
        <View style={{ padding: MD3.spacing.md }}>
          <Skeleton height={140} borderRadius={MD3.shape.large} style={{ marginBottom: 12 }} />
          <Skeleton height={140} borderRadius={MD3.shape.large} style={{ marginBottom: 12 }} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(v) => v.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('VideoPlayer' as never, { videoId: item.id })}
            >
              <Card style={styles.card}>
                <View style={styles.thumb}>
                  <Text style={styles.duration}>{formatDuration(item.durationSeconds)}</Text>
                </View>
                <View style={styles.body}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.meta}>{item.subjectName}</Text>
                  {item.watchedPercent > 0 ? (
                    <View style={styles.progressWrap}>
                      <ProgressBar value={item.watchedPercent} height={4} />
                      <Text style={styles.progressLabel}>
                        {Math.round(item.watchedPercent)}% watched
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => <Text style={styles.empty}>No videos yet</Text>}
        />
      )}
    </View>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  content: { padding: MD3.spacing.md, paddingBottom: 100 },
  card: { padding: 0, marginBottom: MD3.spacing.sm, overflow: 'hidden' },
  thumb: {
    height: 140,
    backgroundColor: MD3.colors.surfaceDim,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 8,
  },
  duration: {
    ...MD3.typography.labelSmall,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: MD3.shape.extraSmall,
  },
  body: { padding: MD3.spacing.md },
  title: { ...MD3.typography.titleMedium, color: MD3.colors.onSurface },
  meta: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant, marginTop: 2 },
  progressWrap: { marginTop: MD3.spacing.sm },
  progressLabel: {
    ...MD3.typography.labelSmall,
    color: MD3.colors.onSurfaceVariant,
    marginTop: 4,
  },
  empty: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: MD3.spacing.xxl,
  },
});
