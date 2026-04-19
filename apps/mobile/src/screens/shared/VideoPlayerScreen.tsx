import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import Video from 'react-native-video';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useApiQuery } from '@/hooks/useApi';
import { api } from '@/api/client';

interface VideoDetail {
  id: string;
  title: string;
  subjectName: string;
  streamUrl: string;
  durationSeconds: number;
  description: string;
}

export function VideoPlayerScreen() {
  const route = useRoute<RouteProp<Record<string, { videoId: string }>>>();
  const [buffering, setBuffering] = useState(true);

  const { data, isLoading } = useApiQuery<VideoDetail>(
    ['video', route.params.videoId],
    () => api.get(`/student/videos/${route.params.videoId}`),
  );

  return (
    <View style={styles.container}>
      <TopAppBar title={data?.title ?? 'Video'} />

      <View style={styles.player}>
        {isLoading || !data ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <>
            <Video
              source={{ uri: data.streamUrl }}
              style={styles.video}
              controls
              resizeMode="contain"
              onBuffer={({ isBuffering }) => setBuffering(isBuffering)}
              onError={(e) => console.error('[video]', e)}
              progressUpdateInterval={5000}
            />
            {buffering ? (
              <View style={styles.bufferOverlay}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            ) : null}
          </>
        )}
      </View>

      {data ? (
        <View style={styles.meta}>
          <Text style={styles.subject}>{data.subjectName}</Text>
          <Text style={styles.description}>{data.description}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  player: {
    height: 220,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: { width: '100%', height: '100%' },
  bufferOverlay: { position: 'absolute' },
  meta: { padding: MD3.spacing.md },
  subject: {
    ...MD3.typography.labelMedium,
    color: MD3.colors.onSurfaceVariant,
  },
  description: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurface,
    marginTop: MD3.spacing.sm,
  },
});
