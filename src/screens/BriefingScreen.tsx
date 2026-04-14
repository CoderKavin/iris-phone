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
  profile?: string;
  persona?: string | {summary?: string};
  contacts?: Array<{name?: string; email?: string; score?: number}>;
  awaiting_reply?: Array<{subject?: string; from?: string}>;
  stale_threads?: Array<{subject?: string; stale_days?: number}>;
  upcoming_events?: any[];
  calendar?: any[] | {events?: any[]};
  commitments?: Array<{description?: string; due?: string}> | {items?: any[]};
  recent_documents?: Array<{filename?: string; type?: string}>;
  observation_counts?: Record<string, number>;
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

function getProfile(s: Situation | null): string {
  if (!s) return '';
  if (typeof s.profile === 'string') return s.profile;
  if (typeof s.persona === 'string') return s.persona;
  if (s.persona && typeof s.persona === 'object') {
    return (s.persona as any).summary ?? '';
  }
  return '';
}

function stripMarkup(s: string): string {
  return s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();
}

function getEvents(s: Situation | null): any[] {
  if (!s) return [];
  if (Array.isArray(s.upcoming_events)) return s.upcoming_events;
  if (Array.isArray(s.calendar)) return s.calendar;
  if (s.calendar && Array.isArray((s.calendar as any).events)) {
    return (s.calendar as any).events;
  }
  return [];
}

function getCommitments(s: Situation | null): any[] {
  if (!s) return [];
  if (Array.isArray(s.commitments)) return s.commitments;
  if (s.commitments && Array.isArray((s.commitments as any).items)) {
    return (s.commitments as any).items;
  }
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

  const profile = stripMarkup(getProfile(data));
  const events = getEvents(data);
  const commitments = getCommitments(data);
  const awaiting = Array.isArray(data?.awaiting_reply) ? data!.awaiting_reply! : [];
  const stale = Array.isArray(data?.stale_threads) ? data!.stale_threads! : [];

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
                {profile || 'Persona not yet established.'}
              </Text>
            </Card>
          </Section>

          <Section title="UPCOMING" count={events.length}>
            {events.length === 0 ? (
              <Text style={styles.empty}>No events.</Text>
            ) : (
              events.map((e: any, i: number) => (
                <Card key={`e-${i}`} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>
                    {e.summary ?? e.title ?? 'Event'}
                  </Text>
                  {!!(e.start ?? e.time ?? e.when) && (
                    <Text style={styles.itemMeta}>
                      {e.start ?? e.time ?? e.when}
                    </Text>
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
              commitments.slice(0, 8).map((c: any, i: number) => (
                <Card key={`c-${i}`} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>
                    {c.description ?? c.text ?? c.title ?? 'Commitment'}
                  </Text>
                  {!!c.due && <Text style={styles.itemMeta}>Due: {c.due}</Text>}
                </Card>
              ))
            )}
          </Section>

          <Section title="AWAITING REPLY" count={awaiting.length}>
            {awaiting.length === 0 ? (
              <Text style={styles.empty}>Inbox quiet.</Text>
            ) : (
              awaiting.slice(0, 6).map((a: any, i: number) => (
                <Card key={`a-${i}`} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{a.subject ?? '(no subject)'}</Text>
                  {!!a.from && <Text style={styles.itemMeta}>from {a.from}</Text>}
                </Card>
              ))
            )}
          </Section>

          <Section title="STALE THREADS" count={stale.length}>
            {stale.length === 0 ? (
              <Text style={styles.empty}>None.</Text>
            ) : (
              stale.slice(0, 6).map((t: any, i: number) => (
                <Card key={`t-${i}`} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>
                    {t.subject || '(no subject)'}
                  </Text>
                  {typeof t.stale_days === 'number' && (
                    <Text style={styles.itemMeta}>{t.stale_days}d stale</Text>
                  )}
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
