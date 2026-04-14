const WINDOW_MS = 60_000;

type Entry = {
  firstSeen: number;
  lastTitleBodyHash: string;
  count: number;
};

const cache = new Map<string, Entry>();

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export type DedupeVerdict =
  | {keep: true; kind: 'first'; key: string}
  | {keep: true; kind: 'changed'; key: string}
  | {keep: false; key: string};

export function dedupe(
  pkg: string,
  id: number,
  title: string,
  body: string,
): DedupeVerdict {
  const key = `${pkg}|${id}|${title}`;
  const now = Date.now();
  const contentHash = hash(title + '\u0001' + body);

  for (const [k, v] of cache) {
    if (now - v.firstSeen > WINDOW_MS) cache.delete(k);
  }

  const existing = cache.get(key);
  if (!existing) {
    cache.set(key, {firstSeen: now, lastTitleBodyHash: contentHash, count: 1});
    return {keep: true, kind: 'first', key};
  }
  if (existing.lastTitleBodyHash === contentHash) {
    existing.count += 1;
    return {keep: false, key};
  }
  existing.lastTitleBodyHash = contentHash;
  existing.count += 1;
  return {keep: true, kind: 'changed', key};
}
