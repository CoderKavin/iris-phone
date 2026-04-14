import React, {useEffect, useRef} from 'react';
import {AppState, AppStateStatus, StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import {colors} from './src/theme/colors';
import {registerDevice, heartbeat} from './src/device/register';
import {maybePromptSamsungBattery} from './src/device/samsungBattery';
import {startForegroundService} from './src/foreground/service';

function App(): React.JSX.Element {
  const deviceIdRef = useRef<string | null>(null);

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
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active' && deviceIdRef.current) {
        heartbeat(deviceIdRef.current).catch(() => {});
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.bg}
        translucent={false}
      />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

export default App;
