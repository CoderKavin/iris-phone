import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const KEY = 'iris.device_id.v1';

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) return existing;
  const fresh = String(uuid.v4());
  await AsyncStorage.setItem(KEY, fresh);
  return fresh;
}
