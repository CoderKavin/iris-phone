import {NativeEventEmitter, NativeModules} from 'react-native';

const {IrisNotificationListener} = NativeModules as {
  IrisNotificationListener?: {
    isPermissionGranted(): Promise<boolean>;
    openSettings(): Promise<void>;
    isListenerConnected(): Promise<boolean>;
  };
};

export const bridge = IrisNotificationListener;

export const emitter = bridge
  ? new NativeEventEmitter(NativeModules.IrisNotificationListener as any)
  : null;

export type NativeNotification = {
  event_type: 'posted' | 'removed';
  app_package: string;
  app_name: string;
  notification_id: number;
  key: string;
  tag?: string | null;
  posted_at_ms: number;
  is_group: boolean;
  is_ongoing: boolean;
  is_clearable: boolean;
  priority: number;
  channel_id?: string;
  category?: string;
  flags: number;
  title: string;
  body: string;
  subtext: string;
  summary: string;
  info_text: string;
  text_lines?: string[];
};

export async function isPermissionGranted(): Promise<boolean> {
  if (!bridge) return false;
  try {
    return await bridge.isPermissionGranted();
  } catch {
    return false;
  }
}

export async function openNotificationSettings(): Promise<void> {
  if (!bridge) return;
  await bridge.openSettings();
}

export async function isListenerConnected(): Promise<boolean> {
  if (!bridge) return false;
  try {
    return await bridge.isListenerConnected();
  } catch {
    return false;
  }
}
