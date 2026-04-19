import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';

interface QrEvent {
  data: string;
  rawData?: string;
  type?: string;
}
import { Teacher } from '@/api/endpoints';
import { MD3 } from '@/config/theme';

interface Props {
  sessionId: string;
  onSuccess: (studentName: string) => void;
}

export function QRScanner({ sessionId, onSuccess }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleScan = useCallback(
    async (e: QrEvent) => {
      if (isProcessing) return;
      setIsProcessing(true);

      try {
        const { data } = await Teacher.scanQr(sessionId, e.data);
        if (data.ok) {
          onSuccess(data.data.studentName);
        } else {
          Alert.alert('Invalid QR', data.error?.message ?? 'Try again');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Scan failed';
        Alert.alert('Error', message);
      } finally {
        setTimeout(() => setIsProcessing(false), 2000);
      }
    },
    [sessionId, isProcessing, onSuccess],
  );

  return (
    <View style={styles.container}>
      <QRCodeScanner
        onRead={handleScan}
        reactivate
        reactivateTimeout={2000}
        showMarker
        markerStyle={styles.marker}
        cameraStyle={styles.camera}
        topContent={
          <Text style={styles.instruction}>
            Point camera at the student&apos;s QR code
          </Text>
        }
      />
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <Text style={styles.processingText}>Processing&hellip;</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { height: 360 },
  marker: { borderColor: MD3.colors.primary, borderRadius: MD3.shape.medium },
  instruction: {
    ...MD3.typography.bodyLarge,
    color: MD3.colors.onSurface,
    textAlign: 'center',
    padding: MD3.spacing.md,
    backgroundColor: MD3.colors.surface,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: MD3.colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: { ...MD3.typography.titleMedium, color: '#fff' },
});
