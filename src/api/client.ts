import {API_BASE, AUTH_TOKEN, COLD_START_THRESHOLD_MS} from './config';
import {loadToken} from '../storage/secure';

export type ApiError = {
  status: number;
  message: string;
  isNetwork?: boolean;
  isTimeout?: boolean;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  retries?: number;
  timeoutMs?: number;
  onColdStart?: () => void;
};

async function authHeader(): Promise<string> {
  const stored = await loadToken();
  return `Bearer ${stored ?? AUTH_TOKEN}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  onColdStart?: () => void,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const coldTimer = onColdStart
    ? setTimeout(onColdStart, COLD_START_THRESHOLD_MS)
    : null;
  try {
    return await fetch(url, {...init, signal: controller.signal});
  } finally {
    clearTimeout(timer);
    if (coldTimer) clearTimeout(coldTimer);
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    retries = 3,
    timeoutMs = 30000,
    onColdStart,
  } = opts;
  const url = `${API_BASE}${path}`;
  const auth = await authHeader();
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
      Accept: 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let lastErr: ApiError | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs, onColdStart);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const err: ApiError = {
          status: res.status,
          message: text || `HTTP ${res.status}`,
        };
        if (res.status >= 500 && attempt < retries) {
          lastErr = err;
          await sleep(Math.min(2000 * 2 ** attempt, 8000));
          continue;
        }
        throw err;
      }
      const text = await res.text();
      return (text ? JSON.parse(text) : null) as T;
    } catch (e: any) {
      const isAbort = e?.name === 'AbortError';
      const err: ApiError = e?.status
        ? e
        : {
            status: 0,
            message: e?.message || String(e),
            isNetwork: !isAbort,
            isTimeout: isAbort,
          };
      lastErr = err;
      if (attempt < retries) {
        await sleep(Math.min(2000 * 2 ** attempt, 8000));
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? {status: 0, message: 'Unknown error'};
}
