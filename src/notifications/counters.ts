import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'iris.notif_count_by_day.v1';

type Store = {day: string; count: number};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function read(): Promise<Store> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {day: todayKey(), count: 0};
  try {
    const parsed = JSON.parse(raw) as Store;
    if (parsed.day !== todayKey()) return {day: todayKey(), count: 0};
    return parsed;
  } catch {
    return {day: todayKey(), count: 0};
  }
}

export async function incrementToday(): Promise<number> {
  const cur = await read();
  cur.count += 1;
  await AsyncStorage.setItem(KEY, JSON.stringify(cur));
  notify(cur.count);
  return cur.count;
}

export async function getTodayCount(): Promise<number> {
  return (await read()).count;
}

type Listener = (n: number) => void;
const listeners = new Set<Listener>();
let lastSeenMs = 0;

export function onCountChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function notify(n: number): void {
  lastSeenMs = Date.now();
  for (const l of listeners) {
    try {
      l(n);
    } catch {}
  }
}

export function getLastSeenMs(): number {
  return lastSeenMs;
}

export function markFlow(): void {
  lastSeenMs = Date.now();
}
