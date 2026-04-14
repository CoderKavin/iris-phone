import notifee, {AndroidImportance} from '@notifee/react-native';
import {Platform} from 'react-native';

const CHANNEL_ID = 'iris-foreground';
const NOTIFICATION_ID = 'iris-active';

let started = false;

export async function startForegroundService(): Promise<void> {
  if (Platform.OS !== 'android' || started) return;
  started = true;

  notifee.registerForegroundService(() => {
    return new Promise(() => {
      // Long-running service body — kept alive while notification is shown.
      // Phase 4.0: no background work wired. Future phases hook in here.
    });
  });

  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'IRIS background',
    importance: AndroidImportance.LOW,
  });

  await notifee.displayNotification({
    id: NOTIFICATION_ID,
    title: 'IRIS is active',
    body: 'Listening for cloud updates',
    android: {
      channelId: CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      smallIcon: 'ic_launcher',
      pressAction: {id: 'default'},
    },
  });
}

export async function stopForegroundService(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.stopForegroundService().catch(() => {});
  started = false;
}
