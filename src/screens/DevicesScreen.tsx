import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, fontSizes, radii, spacing} from '../theme/colors';
import Card from '../components/Card';
import Section from '../components/Section';
import StatusPill from '../components/StatusPill';
import {apiRequest} from '../api/client';
import {getOrCreateDeviceId} from '../storage/deviceId';
import {openNotificationSettings} from '../notifications/bridge';
import {
  useNotificationPermission,
  useTodayCount,
  useQueueSize,
  useFlowStatus,
} from '../notifications/hooks';
import {flushNow} from '../notifications/capture';

type StatusResponse = {
  devices?: any[];
  sync?: Record<string, any>;
  status?: string;
  [k: string]: any;
};

const KNOWN_TYPES: Record<string, string> = {
  laptop: 'Laptop',
  phone: 'Phone',
  glasses: 'Glasses',
};

function deviceTypeLabel(t?: string): string {
  if (!t) return 'Device';
  return KNOWN_TYPES[t.toLowerCase()] ?? t;
}

function isOnline(d: any): boolean {
  if (typeof d?.is_active === 'boolean') return d.is_active;
  if (typeof d?.online === 'boolean') return d.online;
  if (d?.last_seen) {
    const t = new Date(d.last_seen).getTime();
    if (!isNaN(t)) return Date.now() - t < 5 * 60 * 1000;
  }
  return false;
}

export default function DevicesScreen() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thisDeviceId, setThisDeviceId] = useState<string | null>(null);
  const {granted, refresh, connected} = useNotificationPermission();
  const count = useTodayCount();
  const queued = useQueueSize();
  const flow = useFlowStatus(granted);
  const [flushing, setFlushing] = useState(false);
  const [flushResult, setFlushResult] = useState<string | null>(null);

  useEffect(() => {
    getOrCreateDeviceId().then(setThisDeviceId);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<StatusResponse>('/api/status');
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFlush = async () => {
    setFlushing(true);
    setFlushResult(null);
    try {
      const r = await flushNow();
      setFlushResult(
        r.lastError
          ? `Sent ${r.sent}, ${r.remaining} queued, error: ${r.lastError.slice(0, 80)}`
          : `Sent ${r.sent}, ${r.remaining} queued`,
      );
    } finally {
      setFlushing(false);
    }
  };

  const devices = Array.isArray(data?.devices) ? data!.devices! : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Devices</Text>
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
          <Section title="NOTIFICATION CAPTURE">
            <Card accent={flow === 'flowing'}>
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.itemTitle}>
                    Notification access:{' '}
                    <Text
                      style={{
                        color:
                          granted === null
                            ? colors.textMuted
                            : granted
                            ? colors.ok
                            : colors.danger,
                      }}>
                      {granted === null ? '…' : granted ? 'Granted' : 'Denied'}
                    </Text>
                  </Text>
                  <Text style={styles.itemMeta}>
                    Service connected: {connected ? 'yes' : 'no'}
                  </Text>
                  <Text style={styles.itemMeta}>
                    Captured today: {count}
                  </Text>
                  <Text style={styles.itemMeta}>
                    Queued (offline): {queued}
                  </Text>
                </View>
                <StatusPill
                  label={flowLabel(flow)}
                  tone={flowTone(flow)}
                />
              </View>

              <View style={styles.btnRow}>
                <Pressable
                  onPress={async () => {
                    await openNotificationSettings();
                    setTimeout(refresh, 500);
                  }}
                  style={({pressed}) => [
                    styles.btn,
                    styles.btnSecondary,
                    pressed && {opacity: 0.7},
                  ]}>
                  <Text style={styles.btnSecondaryText}>
                    {granted ? 'Manage access' : 'Grant access'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleFlush}
                  disabled={flushing}
                  style={({pressed}) => [
                    styles.btn,
                    styles.btnPrimary,
                    (pressed || flushing) && {opacity: 0.7},
                  ]}>
                  <Text style={styles.btnPrimaryText}>
                    {flushing ? 'Flushing…' : 'Flush now'}
                  </Text>
                </Pressable>
              </View>
              {flushResult && (
                <Text style={styles.flushResult}>{flushResult}</Text>
              )}
            </Card>
          </Section>

          <Section title="CONNECTED" count={devices.length}>
            {devices.length === 0 ? (
              <Text style={styles.empty}>
                No devices reported by cloud.
              </Text>
            ) : (
              devices.map((d: any, i: number) => {
                const online = isOnline(d);
                const isThis = d.device_id && d.device_id === thisDeviceId;
                return (
                  <Card
                    key={`d-${d.device_id ?? i}`}
                    accent={isThis}
                    style={styles.itemCard}>
                    <View style={styles.row}>
                      <View style={styles.flex1}>
                        <Text style={styles.itemTitle}>
                          {deviceTypeLabel(d.device_type)}
                          {isThis && (
                            <Text style={styles.thisLabel}>  · this</Text>
                          )}
                        </Text>
                        {!!d.device_name && (
                          <Text style={styles.itemMeta}>{d.device_name}</Text>
                        )}
                        {!!d.last_seen && (
                          <Text style={styles.itemMeta}>
                            Last seen: {d.last_seen}
                          </Text>
                        )}
                      </View>
                      <StatusPill
                        label={online ? 'Online' : 'Offline'}
                        tone={online ? 'ok' : 'muted'}
                      />
                    </View>
                  </Card>
                );
              })
            )}
          </Section>

          <Section title="SYNC">
            <Card>
              <Text style={styles.body}>
                {data?.status ?? 'Cloud reachable.'}
              </Text>
              {data?.sync &&
                Object.entries(data.sync).map(([k, v]) => (
                  <Text key={k} style={styles.kv}>
                    <Text style={styles.kvKey}>{k}: </Text>
                    {typeof v === 'string' ? v : JSON.stringify(v)}
                  </Text>
                ))}
            </Card>
          </Section>

          <Pressable
            onPress={() => {
              setRefreshing(true);
              load();
            }}
            style={({pressed}) => [
              styles.resyncBtn,
              pressed && {opacity: 0.7},
            ]}>
            <Text style={styles.resyncText}>Re-sync</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function flowLabel(flow: 'denied' | 'flowing' | 'idle' | 'unknown'): string {
  switch (flow) {
    case 'flowing':
      return 'Flowing';
    case 'idle':
      return 'Idle';
    case 'denied':
      return 'Denied';
    default:
      return '…';
  }
}

function flowTone(flow: 'denied' | 'flowing' | 'idle' | 'unknown'): 'ok' | 'warn' | 'danger' | 'muted' {
  switch (flow) {
    case 'flowing':
      return 'ok';
    case 'idle':
      return 'warn';
    case 'denied':
      return 'danger';
    default:
      return 'muted';
  }
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
  scrollContent: {padding: spacing.lg, paddingBottom: spacing.xxl},
  itemCard: {marginBottom: spacing.sm},
  row: {flexDirection: 'row', alignItems: 'center'},
  flex1: {flex: 1},
  itemTitle: {color: colors.textPrimary, fontSize: fontSizes.md, fontWeight: '600'},
  thisLabel: {color: colors.accent, fontSize: fontSizes.xs, fontWeight: '500'},
  itemMeta: {color: colors.textSecondary, fontSize: fontSizes.sm, marginTop: 2},
  body: {color: colors.textPrimary, fontSize: fontSizes.md, marginBottom: spacing.sm},
  kv: {color: colors.textSecondary, fontSize: fontSizes.sm, marginTop: 2},
  kvKey: {color: colors.textMuted},
  empty: {color: colors.textMuted, fontStyle: 'italic'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  btnRow: {flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm},
  btn: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  btnPrimary: {backgroundColor: colors.accent},
  btnPrimaryText: {color: colors.textPrimary, fontWeight: '700'},
  btnSecondary: {
    borderColor: colors.accentBorder,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  btnSecondaryText: {color: colors.accent, fontWeight: '600'},
  flushResult: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    marginTop: spacing.sm,
  },
  resyncBtn: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
    borderWidth: 1,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  resyncText: {color: colors.accent, fontWeight: '700'},
});
