import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Admin } from '@/api/endpoints';
import { useApiQuery } from '@/hooks/useApi';
import { MD3 } from '@/config/theme';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { TextField } from '@/components/ui/TextField';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';

interface Student {
  id: string;
  rollNumber: string;
  name: string;
  classStandardName: string;
  batchName: string;
  isActive: boolean;
}

export function StudentsScreen() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useApiQuery<{ items: Student[] }>(
    ['admin-students', search],
    () => Admin.students({ search: search || undefined }),
  );

  return (
    <View style={styles.container}>
      <TopAppBar title="Students" />
      <View style={styles.searchWrap}>
        <TextField
          label="Search by name or roll no."
          value={search}
          onChangeText={setSearch}
          placeholder="Type to filter\u2026"
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>

      {isLoading || !data ? (
        <View style={{ padding: MD3.spacing.md }}>
          <Skeleton height={80} borderRadius={MD3.shape.medium} style={{ marginBottom: 8 }} />
          <Skeleton height={80} borderRadius={MD3.shape.medium} style={{ marginBottom: 8 }} />
          <Skeleton height={80} borderRadius={MD3.shape.medium} />
        </View>
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <Pressable
              android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
              style={styles.row}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.rollNumber} \u00B7 {item.classStandardName} \u00B7 {item.batchName}
                </Text>
              </View>
              <Badge
                label={item.isActive ? 'Active' : 'Inactive'}
                color={item.isActive ? 'good' : 'neutral'}
                size="small"
              />
            </Pressable>
          )}
          ListEmptyComponent={() => (
            <Text style={styles.empty}>No students match</Text>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MD3.colors.background },
  searchWrap: { padding: MD3.spacing.md, paddingBottom: 0 },
  content: { padding: MD3.spacing.md, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MD3.colors.outlineVariant,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MD3.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { ...MD3.typography.titleMedium, color: MD3.colors.onPrimaryContainer },
  body: { flex: 1 },
  name: { ...MD3.typography.bodyLarge, color: MD3.colors.onSurface },
  meta: { ...MD3.typography.bodySmall, color: MD3.colors.onSurfaceVariant, marginTop: 2 },
  empty: {
    ...MD3.typography.bodyMedium,
    color: MD3.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: MD3.spacing.xxl,
  },
});
