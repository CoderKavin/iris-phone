import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, fontSizes, spacing} from '../theme/colors';
import Card from '../components/Card';
import Section from '../components/Section';
import {apiRequest} from '../api/client';

type FeedItem = {
  id?: string;
  title?: string;
  text?: string;
  body?: string;
  description?: string;
  source?: string;
  timestamp?: string;
  priority?: string;
  [k: string]: any;
};

type FeedResponse = {
  urgent_now?: FeedItem[];
  today?: FeedItem[];
  noticed?: FeedItem[];
  what_iris_noticed?: FeedItem[];
  [k: string]: any;
};

type Row =
  | {kind: 'header'; title: string; count: number}
  | {kind: 'item'; item: FeedItem; accent?: boolean}
  | {kind: 'empty'; text: string};

const SECTIONS: {key: keyof FeedResponse | string; title: string; accent?: boolean; alts?: string[]}[] =
  [
    {key: 'urgent_now', title: 'URGENT NOW', accent: true},
    {key: 'today', title: 'TODAY'},
    {key: 'noticed', title: 'WHAT IRIS NOTICED', alts: ['what_iris_noticed']},
  ];

function pickArray(obj: FeedResponse | null, key: string, alts?: string[]): FeedItem[] {
  if (!obj) return [];
  const v = (obj as any)[key];
  if (Array.isArray(v)) return v;
  if (alts) {
    for (const a of alts) {
      const av = (obj as any)[a];
      if (Array.isArray(av)) return av;
    }
  }
  return [];
}

function flatten(data: FeedResponse | null): Row[] {
  const rows: Row[] = [];
  for (const s of SECTIONS) {
    const items = pickArray(data, s.key as string, s.alts);
    rows.push({kind: 'header', title: s.title, count: items.length});
    if (items.length === 0) {
      rows.push({kind: 'empty', text: 'Nothing here.'});
    } else {
      for (const item of items) {
        rows.push({kind: 'item', item, accent: s.accent});
      }
    }
  }
  return rows;
}

export default function FeedScreen() {
  const [data, setData] = useState<FeedResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<FeedResponse>('/api/feed');
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load feed');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const rows = flatten(data);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
        {error && <Text style={styles.headerError}>{error}</Text>}
      </View>
      {initialLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r, i) =>
            r.kind === 'header'
              ? `h-${r.title}`
              : r.kind === 'empty'
              ? `e-${i}`
              : `i-${r.item.id ?? i}`
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          renderItem={({item}) => {
            if (item.kind === 'header') {
              return <Section title={item.title} count={item.count} />;
            }
            if (item.kind === 'empty') {
              return <Text style={styles.empty}>{item.text}</Text>;
            }
            return <FeedCard item={item.item} accent={item.accent} />;
          }}
        />
      )}
    </SafeAreaView>
  );
}

function FeedCard({item, accent}: {item: FeedItem; accent?: boolean}) {
  const title = item.title ?? item.source ?? 'Item';
  const body = item.text ?? item.body ?? item.description ?? '';
  return (
    <Card accent={accent} style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {!!body && <Text style={styles.cardBody}>{body}</Text>}
      {!!item.timestamp && (
        <Text style={styles.cardMeta}>{item.timestamp}</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg},
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.xl,
    fontWeight: '700',
  },
  headerError: {color: colors.danger, fontSize: fontSizes.xs, marginTop: 4},
  listContent: {padding: spacing.lg, paddingBottom: spacing.xxl},
  card: {marginBottom: spacing.md},
  cardTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: spacing.sm,
  },
  empty: {
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: spacing.lg,
  },
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
});
