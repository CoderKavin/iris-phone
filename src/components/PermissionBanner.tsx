import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {colors, fontSizes, radii, spacing} from '../theme/colors';
import {openNotificationSettings} from '../notifications/bridge';

export default function PermissionBanner({onRecheck}: {onRecheck: () => void}) {
  const handle = async () => {
    await openNotificationSettings();
    setTimeout(onRecheck, 500);
  };
  return (
    <Pressable
      onPress={handle}
      style={({pressed}) => [styles.wrap, pressed && {opacity: 0.8}]}>
      <Text style={styles.text}>
        Notification access not granted — IRIS is missing context. Tap to fix.
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderBottomColor: 'rgba(251,191,36,0.35)',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  text: {color: colors.warn, fontSize: fontSizes.sm, textAlign: 'center'},
});
