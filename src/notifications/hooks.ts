import {useCallback, useEffect, useState} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {isPermissionGranted, isListenerConnected} from './bridge';
import {getTodayCount, onCountChange, getLastSeenMs} from './counters';
import {queueSize} from './queue';

export function useNotificationPermission(): {
  granted: boolean | null;
  refresh: () => Promise<boolean>;
  connected: boolean;
} {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    const g = await isPermissionGranted();
    const c = await isListenerConnected();
    setGranted(g);
    setConnected(c);
    return g;
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') refresh();
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [refresh]);

  return {granted, refresh, connected};
}

export function useTodayCount(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    getTodayCount().then(setN);
    return onCountChange(setN);
  }, []);
  return n;
}

export function useQueueSize(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      const size = await queueSize();
      if (mounted) setN(size);
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);
  return n;
}

export type FlowStatus = 'denied' | 'flowing' | 'idle' | 'unknown';

export function useFlowStatus(granted: boolean | null): FlowStatus {
  const [status, setStatus] = useState<FlowStatus>('unknown');
  useEffect(() => {
    const check = () => {
      if (granted === null) return setStatus('unknown');
      if (!granted) return setStatus('denied');
      const last = getLastSeenMs();
      if (last === 0) return setStatus('idle');
      const age = Date.now() - last;
      setStatus(age < 10 * 60_000 ? 'flowing' : 'idle');
    };
    check();
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, [granted]);
  return status;
}
