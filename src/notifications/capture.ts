import {EmitterSubscription} from 'react-native';
import {emitter, NativeNotification} from './bridge';
import {classify} from './filter';
import {redact} from './redact';
import {dedupe} from './dedupe';
import {
  enqueue,
  flush,
  hasLoggedUnknown,
  markUnknownLogged,
  Observation,
} from './queue';
import {getOrCreateDeviceId} from '../storage/deviceId';
import {incrementToday, markFlow} from './counters';

const DEBOUNCE_MS = 5000;

let subscription: EmitterSubscription | null = null;
let cachedDeviceId: string | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function deviceId(): Promise<string> {
  if (!cachedDeviceId) cachedDeviceId = await getOrCreateDeviceId();
  return cachedDeviceId;
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    const result = await flush({batchSize: 10});
    if (result.remaining > 0 && result.lastError) {
      console.warn(
        `IRIS obs flush paused: ${result.sent} sent, ${result.remaining} queued, error: ${result.lastError}`,
      );
    } else if (result.sent > 0) {
      console.log(`IRIS obs flush: ${result.sent} sent`);
    }
  }, DEBOUNCE_MS);
}

async function handleNotification(n: NativeNotification): Promise<void> {
  if (n.event_type !== 'posted') return;
  if (n.is_ongoing) return;

  const verdict = classify(n.app_package);

  if (verdict.action === 'drop') {
    return;
  }

  if (verdict.action === 'unknown') {
    const already = await hasLoggedUnknown(n.app_package);
    if (already) return;
    await markUnknownLogged(n.app_package);
    const obs: Observation = {
      source: 'phone_notification',
      timestamp: new Date().toISOString(),
      app_package: n.app_package,
      app_name: n.app_name ?? n.app_package,
      title: '[unknown_app]',
      body: '[unknown_app]',
      subtext: null,
      category: 'unknown_app',
      is_group: false,
      posted_at_ms: n.posted_at_ms,
      priority: n.priority,
      raw_content: `unknown_app: ${n.app_package}`,
      extracted_entities: {},
      device_id: await deviceId(),
      classification: 'unknown',
    };
    await enqueue(obs);
    markFlow();
    await incrementToday();
    scheduleFlush();
    return;
  }

  const dupe = dedupe(n.app_package, n.notification_id, n.title, n.body);
  if (!dupe.keep) return;

  let title = n.title;
  let body = n.body;
  let subtext: string | null = n.subtext || null;
  let redacted = false;
  const reasons: string[] = [];

  if (verdict.action === 'gray') {
    title = '[content withheld for privacy]';
    body = '[content withheld for privacy]';
    subtext = null;
  } else {
    const rTitle = redact(n.title);
    const rBody = redact(n.body);
    const rSub = redact(n.subtext);
    title = rTitle.text;
    body = rBody.text;
    subtext = rSub.text || null;
    redacted = rTitle.redacted || rBody.redacted || rSub.redacted;
    for (const r of [...rTitle.reasons, ...rBody.reasons, ...rSub.reasons]) {
      if (!reasons.includes(r)) reasons.push(r);
    }
    if (redacted) {
      console.warn(
        `IRIS redacted ${reasons.join(',')} in notification from ${n.app_package}`,
      );
    }
  }

  const rawParts = [n.title, n.body, n.subtext].filter(s => s && s.length > 0);
  const raw_content =
    verdict.action === 'gray' ? '[content withheld for privacy]' : rawParts.join(' · ');

  const obs: Observation = {
    source: 'phone_notification',
    timestamp: new Date().toISOString(),
    app_package: n.app_package,
    app_name: n.app_name ?? n.app_package,
    title,
    body,
    subtext,
    category: verdict.category,
    is_group: !!n.is_group,
    posted_at_ms: n.posted_at_ms,
    priority: n.priority,
    raw_content:
      verdict.action === 'gray'
        ? raw_content
        : redact(rawParts.join(' · ')).text,
    extracted_entities: {},
    device_id: await deviceId(),
    redacted,
    redaction_reasons: reasons.length > 0 ? reasons : undefined,
    classification: verdict.action,
  };

  await enqueue(obs);
  markFlow();
  await incrementToday();
  console.log(
    `IRIS ingest ${verdict.action}:${verdict.category ?? 'unknown'} from ${n.app_package}: ${obs.title.slice(0, 60)}`,
  );
  scheduleFlush();
}

export function startCapture(): void {
  if (subscription || !emitter) return;
  subscription = emitter.addListener('IrisNotificationPosted', async (ev: NativeNotification) => {
    try {
      await handleNotification(ev);
    } catch (e) {
      console.warn('IRIS handleNotification failed:', e);
    }
  });
  flush().catch(() => {});
}

export function stopCapture(): void {
  if (subscription) {
    subscription.remove();
    subscription = null;
  }
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

export async function flushNow(): Promise<ReturnType<typeof flush>> {
  return flush({batchSize: 10});
}
