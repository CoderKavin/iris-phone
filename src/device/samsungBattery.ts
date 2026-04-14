import {Alert, Linking, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROMPTED_KEY = 'iris.samsung_battery_prompted.v1';

export async function maybePromptSamsungBattery(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const already = await AsyncStorage.getItem(PROMPTED_KEY);
  if (already) return;
  let manufacturer = '';
  try {
    manufacturer = (await DeviceInfo.getManufacturer()).toLowerCase();
  } catch {
    return;
  }
  if (!manufacturer.includes('samsung')) return;

  Alert.alert(
    'Keep IRIS running',
    'Samsung aggressively restricts background apps. To keep IRIS running reliably, please enable Unrestricted battery usage.',
    [
      {
        text: 'Not now',
        style: 'cancel',
        onPress: () => AsyncStorage.setItem(PROMPTED_KEY, '1'),
      },
      {
        text: 'Open settings',
        onPress: async () => {
          await AsyncStorage.setItem(PROMPTED_KEY, '1');
          try {
            await Linking.sendIntent(
              'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS',
            );
          } catch {
            await Linking.openSettings();
          }
        },
      },
    ],
  );
}
