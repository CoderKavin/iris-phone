import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, fontSizes, spacing} from '../theme/colors';
import Card from '../components/Card';
import Section from '../components/Section';
import {apiRequest} from '../api/client';

type Situation = {
  persona?: string | {summary?: string; [k: string]: any};
  calendar?: any[] | {events?: any[]; [k: string]: any};
  relationships?: any;
  commitments?: any[];
  [k: string]: any;
};

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Tonight';
}

function asString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const s = (v as any).summary ?? (v as any).text ?? null;
    if (typeof s === 'string') return s;
    return JSON.stringify(v, null, 2);
  }
  if (v == null) return '';
  return String(v);
}

function getCalendarEvents(c: any): any[] {
  if (!c) return [];
  if (Array.isArray(c)) return c;
  if (Array.isArray(c.events)) return c.events;
  return [];
}

function getCommitments(c: any): any[] {
  if (Array.isArray(c)) return c;
  if (c && Array.isArray(c.items)) return c.items;
  return [];
}

export default function BriefingScreen() {
  const [data, setData] = useState<Situation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<Situation>('/api/situation');
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load briefing');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persona = asString(data?.persona);
  const events = getCalendarEvents(data?.calendar);
  const commitments = getCommitments(data?.commitments);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.greet}>{timeOfDay()}</Text>
        <Text style={styles.headerTitle}>Briefing</Text>
        {error && <Text style={styles.headerError}>{error}</Text>}
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.accent}
            />
          }>
          <Section title="WHO YOU ARE">
            <Card>
              <Text style={styles.body}>
                {persona || 'Persona not yet established.'}
              </Text>
            </Card>
          </Section>

          <Section title="CALENDAR" count={events.length}>
            {events.length === 0 ? (
              <Text style={styles.empty}>No events.</Text>
            ) : (
              events.map((e: any, i: number) => (
                <Card key={`e-${i}`} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>
                    {e.summary ?? e.title ?? 'Event'}
                  </Text>
                  {!!(e.start ?? e.time) && (
                    <Text style={styles.itemMeta}>{e.start ?? e.time}</Text>
                  )}
                  {!!e.location && (
                    <Text style={styles.itemMeta}>{e.location}</Text>
                  )}
                </Card>
              ))
            )}
          </Section>

          <Section title="COMMITMENTS" count={commitments.length}>
            {commitments.length === 0 ? (
              <Text style={styles.empty}>None.</Text>
            ) : (
              commitments.map((c: any, i: number) => (
                <Card key={`c-${i}`} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>
                    {c.text ?? c.title ?? c.description ?? 'Commitment'}
                  </Text>
                  {!!c.due && <Text style={styles.itemMeta}>Due: {c.due}</Text>}
                </Card>
              ))
            )}
          </Section>
        </ScrollView>
      )}
    </SafeAreaView>
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
  greet: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    marginTop: 2,
  },
  headerError: {color: colors.danger, fontSize: fontSizes.xs, marginTop: 4},
  scrollContent: {padding: spacing.lg, paddingBottom: spacing.xxl},
  body: {color: colors.textPrimary, fontSize: fontSizes.md, lineHeight: 22},
  itemCard: {marginBottom: spacing.sm},
  itemTitle: {color: colors.textPrimary, fontSize: fontSizes.md, fontWeight: '600'},
  itemMeta: {color: colors.textSecondary, fontSize: fontSizes.sm, marginTop: 2},
  empty: {color: colors.textMuted, fontStyle: 'italic'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
});
