import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.iris.phone.auth';

export async function saveToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('iris', token, {service: SERVICE});
}

export async function loadToken(): Promise<string | null> {
  const result = await Keychain.getGenericPassword({service: SERVICE});
  return result ? result.password : null;
}

export async function clearToken(): Promise<void> {
  await Keychain.resetGenericPassword({service: SERVICE});
}
