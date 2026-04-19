import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MD3 } from '@/config/theme';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, isSameDay, parseISO } from 'date-fns';

export interface AttendanceDay {
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'NONE';
}

interface Props {
  month: Date;
  days: AttendanceDay[];
}

const STATUS_COLORS: Record<AttendanceDay['status'], string> = {
  PRESENT: MD3.colors.success,
  ABSENT: MD3.colors.error,
  LATE: MD3.colors.warning,
  EXCUSED: MD3.colors.info,
  NONE: 'transparent',
};

export function CalendarView({ month, days }: Props) {
  const dayMap = useMemo(() => {
    const map = new Map<string, AttendanceDay['status']>();
    for (const d of days) {
      map.set(format(parseISO(d.date), 'yyyy-MM-dd'), d.status);
    }
    return map;
  }, [days]);

  const interval = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  }, [month]);

  const leadingBlanks = getDay(startOfMonth(month));

  const cells: ({ date: Date; status: AttendanceDay['status'] } | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...interval.map((date) => ({
      date,
      status: dayMap.get(format(date, 'yyyy-MM-dd')) ?? 'NONE',
    })),
  ];

  return (
    <View>
      <Text style={styles.monthTitle}>{format(month, 'MMMM yyyy')}</Text>

      <View style={styles.weekRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
          <Text key={idx} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, idx) => (
          <View key={idx} style={styles.cell}>
            {cell ? (
              <View style={[styles.dot, { backgroundColor: STATUS_COLORS[cell.status] }]}>
                <Text
                  style={[
                    styles.dayNumber,
                    cell.status !== 'NONE' && { color: '#fff' },
                    isSameDay(cell.date, new Date()) && { fontWeight: '700' },
                  ]}
                >
                  {format(cell.date, 'd')}
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthTitle: {
    ...MD3.typography.titleMedium,
    color: MD3.colors.onSurface,
    textAlign: 'center',
    marginBottom: MD3.spacing.md,
  },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: {
    ...MD3.typography.labelSmall,
    color: MD3.colors.onSurfaceVariant,
    flex: 1,
    textAlign: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: { ...MD3.typography.bodySmall, color: MD3.colors.onSurface },
});
