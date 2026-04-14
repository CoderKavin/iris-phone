import AsyncStorage from '@react-native-async-storage/async-storage';
import {apiRequest} from '../api/client';

const QKEY = 'iris.obs_queue.v1';
const UNKNOWN_LOGGED_KEY = 'iris.unknown_apps.v1';

export type Observation = {
  source: 'phone_notification';
  timestamp: string;
  app_package: string;
  app_name: string;
  title: string;
  body: string;
  subtext: string | null;
  category: string;
  is_group: boolean;
  posted_at_ms: number;
  priority: number;
  raw_content: string;
  extracted_entities: Record<string, unknown>;
  device_id: string;
  redacted?: boolean;
  redaction_reasons?: string[];
  classification?: string;
};

const MAX_QUEUE = 500;

async function readQueue(): Promise<Observation[]> {
  const raw = await AsyncStorage.getItem(QKEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(list: Observation[]): Promise<void> {
  const trimmed = list.length > MAX_QUEUE ? list.slice(-MAX_QUEUE) : list;
  await AsyncStorage.setItem(QKEY, JSON.stringify(trimmed));
}

export async function enqueue(obs: Observation): Promise<number> {
  const list = await readQueue();
  list.push(obs);
  await writeQueue(list);
  return list.length;
}

export async function queueSize(): Promise<number> {
  return (await readQueue()).length;
}

let flushing = false;

export async function flush(opts: {batchSize?: number} = {}): Promise<{
  sent: number;
  remaining: number;
  lastError?: string;
}> {
  if (flushing) return {sent: 0, remaining: await queueSize()};
  flushing = true;
  const batchSize = opts.batchSize ?? 10;
  let totalSent = 0;
  let lastError: string | undefined;
  try {
    while (true) {
      const list = await readQueue();
      if (list.length === 0) break;
      const batch = list.slice(0, batchSize);
      try {
        await apiRequest('/api/observations', {
          method: 'POST',
          body: {observations: batch},
          retries: 0,
          timeoutMs: 20000,
        });
        const remaining = list.slice(batch.length);
        await writeQueue(remaining);
        totalSent += batch.length;
      } catch (e: any) {
        lastError = e?.message ?? String(e);
        break;
      }
    }
    const remaining = await queueSize();
    return {sent: totalSent, remaining, lastError};
  } finally {
    flushing = false;
  }
}

export async function hasLoggedUnknown(pkg: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(UNKNOWN_LOGGED_KEY);
  if (!raw) return false;
  try {
    const list = JSON.parse(raw) as string[];
    return Array.isArray(list) && list.includes(pkg);
  } catch {
    return false;
  }
}

export async function markUnknownLogged(pkg: string): Promise<void> {
  const raw = await AsyncStorage.getItem(UNKNOWN_LOGGED_KEY);
  let list: string[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {}
  }
  if (!list.includes(pkg)) {
    list.push(pkg);
    await AsyncStorage.setItem(UNKNOWN_LOGGED_KEY, JSON.stringify(list));
  }
}
