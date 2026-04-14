import DeviceInfo from 'react-native-device-info';
import {Platform} from 'react-native';
import {apiRequest} from '../api/client';
import {getOrCreateDeviceId} from '../storage/deviceId';
import {APP_VERSION} from '../api/config';

export type DeviceRegistration = {
  device_type: 'phone';
  device_id: string;
  device_name: string;
  os: string;
  os_version: string;
  app_version: string;
};

export async function registerDevice(): Promise<{
  deviceId: string;
  registered: boolean;
  error?: string;
}> {
  const deviceId = await getOrCreateDeviceId();
  const payload: DeviceRegistration = {
    device_type: 'phone',
    device_id: deviceId,
    device_name: await DeviceInfo.getDeviceName().catch(() => 'Android Phone'),
    os: Platform.OS === 'android' ? 'Android' : Platform.OS,
    os_version: String(Platform.Version),
    app_version: APP_VERSION,
  };
  try {
    await apiRequest('/api/devices/register', {
      method: 'POST',
      body: payload,
      retries: 1,
    });
    return {deviceId, registered: true};
  } catch (e: any) {
    return {deviceId, registered: false, error: e?.message ?? String(e)};
  }
}

export async function heartbeat(deviceId: string): Promise<boolean> {
  try {
    await apiRequest(`/api/devices/${deviceId}/heartbeat`, {
      method: 'PATCH',
      retries: 1,
    });
    return true;
  } catch {
    return false;
  }
}
