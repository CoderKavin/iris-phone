import filters from './filters.json';

export type FilterDecision =
  | {action: 'ingest'; category: string}
  | {action: 'gray'; category: string}
  | {action: 'drop'; reason: string}
  | {action: 'unknown'};

const WHITELIST: Record<string, string[]> = filters.whitelist as any;
const BLACKLIST: Record<string, string[]> = filters.blacklist as any;
const GRAYLIST: Record<string, string[]> = filters.graylist as any;

const SAMSUNG_EXEMPT = new Set(
  (filters.blacklist as any).samsung_allowlist_exempt as string[],
);

function firstCategoryContaining(
  pkg: string,
  lists: Record<string, string[]>,
): string | null {
  for (const [cat, arr] of Object.entries(lists)) {
    if (cat === 'samsung_allowlist_exempt') continue;
    if (cat === 'games_prefix') {
      if (arr.some(prefix => pkg.startsWith(prefix))) return cat;
    } else if (arr.includes(pkg)) {
      return cat;
    }
  }
  return null;
}

export function classify(pkg: string): FilterDecision {
  if (!pkg) return {action: 'drop', reason: 'empty_package'};

  const whiteCat = firstCategoryContaining(pkg, WHITELIST);
  if (whiteCat) return {action: 'ingest', category: whiteCat};

  const grayCat = firstCategoryContaining(pkg, GRAYLIST);
  if (grayCat) return {action: 'gray', category: grayCat};

  const blackCat = firstCategoryContaining(pkg, BLACKLIST);
  if (blackCat) return {action: 'drop', reason: `blacklist:${blackCat}`};

  if (pkg.startsWith('com.samsung.') && !SAMSUNG_EXEMPT.has(pkg)) {
    return {action: 'drop', reason: 'samsung_oem_noise'};
  }

  return {action: 'unknown'};
}
