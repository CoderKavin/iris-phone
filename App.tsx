import React, {useEffect, useRef, useState} from 'react';
import {AppState, AppStateStatus, StatusBar, View, StyleSheet} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RootNavigator from './src/navigation/RootNavigator';
import NotificationPermissionGate from './src/screens/NotificationPermissionGate';
import PermissionBanner from './src/components/PermissionBanner';
import {colors} from './src/theme/colors';
import {registerDevice, heartbeat} from './src/device/register';
import {maybePromptSamsungBattery} from './src/device/samsungBattery';
import {startForegroundService} from './src/foreground/service';
import {isPermissionGranted} from './src/notifications/bridge';
import {startCapture, stopCapture, flushNow} from './src/notifications/capture';

const SKIP_KEY = 'iris.notif_gate_skipped.v1';

function App(): React.JSX.Element {
  const deviceIdRef = useRef<string | null>(null);
  const [gateState, setGateState] = useState<'loading' | 'gate' | 'main'>('loading');
  const [skipped, setSkipped] = useState(false);
  const [granted, setGranted] = useState(false);
  const captureStartedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await registerDevice();
      if (cancelled) return;
      deviceIdRef.current = result.deviceId;
      if (!result.registered) {
        console.warn('IRIS device register failed:', result.error);
      }
      await heartbeat(result.deviceId);
      startForegroundService().catch(e =>
        console.warn('foreground service start failed:', e),
      );
      maybePromptSamsungBattery().catch(() => {});

      const permGranted = await isPermissionGranted();
      const priorSkip = await AsyncStorage.getItem(SKIP_KEY);
      if (cancelled) return;
      setGranted(permGranted);
      if (permGranted) {
        if (!captureStartedRef.current) {
          startCapture();
          captureStartedRef.current = true;
        }
        setGateState('main');
      } else if (priorSkip) {
        setSkipped(true);
        setGateState('main');
      } else {
        setGateState('gate');
      }
    })();
    return () => {
      cancelled = true;
      stopCapture();
    };
  }, []);

  useEffect(() => {
    const onChange = async (state: AppStateStatus) => {
      if (state !== 'active') return;
      if (deviceIdRef.current) {
        heartbeat(deviceIdRef.current).catch(() => {});
      }
      const g = await isPermissionGranted();
      setGranted(g);
      if (g && !captureStartedRef.current) {
        startCapture();
        captureStartedRef.current = true;
      }
      if (g) flushNow().catch(() => {});
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  const recheck = async () => {
    const g = await isPermissionGranted();
    setGranted(g);
    if (g) {
      if (!captureStartedRef.current) {
        startCapture();
        captureStartedRef.current = true;
      }
      setGateState('main');
    }
    return g;
  };

  const skip = async () => {
    await AsyncStorage.setItem(SKIP_KEY, '1');
    setSkipped(true);
    setGateState('main');
  };

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.bg}
        translucent={false}
      />
      {gateState === 'loading' ? (
        <View style={styles.loading} />
      ) : gateState === 'gate' ? (
        <NotificationPermissionGate onSkip={skip} onRechecked={recheck} />
      ) : (
        <View style={styles.root}>
          {!granted && skipped && <PermissionBanner onRecheck={recheck} />}
          <RootNavigator />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {flex: 1, backgroundColor: colors.bg},
  root: {flex: 1, backgroundColor: colors.bg},
});

export default App;
