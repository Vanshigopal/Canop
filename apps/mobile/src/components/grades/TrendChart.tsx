import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { MD3 } from '@/config/theme';

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
  color?: string;
}

export function TrendChart({ data, height = 160, color = MD3.colors.primary }: Props) {
  const width = Dimensions.get('window').width - MD3.spacing.md * 4;
  const padding = 24;

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    );
  }

  const max = Math.max(100, ...data.map((d) => d.value));
  const min = Math.min(0, ...data.map((d) => d.value));
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = padding + (i * (width - padding * 2)) / Math.max(1, data.length - 1);
    const y = padding + ((max - d.value) / range) * (height - padding * 2);
    return { x, y, ...d };
  });

  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Baseline grid lines */}
        {[0.25, 0.5, 0.75].map((ratio) => {
          const y = padding + ratio * (height - padding * 2);
          return (
            <Line
              key={ratio}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke={MD3.colors.outlineVariant}
              strokeDasharray="3,3"
            />
          );
        })}

        <Polyline
          points={pointsAttr}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={color} />
        ))}
      </Svg>

      <View style={styles.labelsRow}>
        {points.map((p, i) => (
          <Text key={i} style={styles.axisLabel}>
            {p.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...MD3.typography.bodyMedium, color: MD3.colors.onSurfaceVariant },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  axisLabel: { ...MD3.typography.labelSmall, color: MD3.colors.onSurfaceVariant },
});
