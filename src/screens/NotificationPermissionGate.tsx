import React from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, fontSizes, radii, spacing} from '../theme/colors';
import {openNotificationSettings} from '../notifications/bridge';

type Props = {
  onSkip: () => void;
  onRechecked: () => Promise<boolean>;
};

export default function NotificationPermissionGate({onSkip, onRechecked}: Props) {
  const [opening, setOpening] = React.useState(false);

  const handleContinue = async () => {
    setOpening(true);
    try {
      await openNotificationSettings();
    } finally {
      setOpening(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={styles.eyebrow}>ONE-TIME SETUP</Text>
        <Text style={styles.h1}>IRIS needs notification access</Text>
        <Text style={styles.body}>
          To catch commitments, messages, and context automatically, IRIS
          reads every notification the phone receives.
        </Text>
        <View style={styles.bullets}>
          <Bullet text="Only notifications from whitelisted apps (WhatsApp, Gmail, Calendar, messaging, banking) get sent to the cloud." />
          <Bullet text="Games, social feeds, shopping, and system noise are always dropped." />
          <Bullet text="Health, password, and crypto apps are logged as metadata only — body is never sent." />
          <Bullet text="OTP codes, passwords, and credit cards are redacted before leaving your phone." />
        </View>
        <Text style={styles.hint}>
          On the next screen, scroll to IRIS and toggle it on.
        </Text>

        <Pressable
          onPress={handleContinue}
          disabled={opening}
          style={({pressed}) => [
            styles.primary,
            pressed && {opacity: 0.75},
            opening && {opacity: 0.5},
          ]}>
          <Text style={styles.primaryText}>
            {opening ? 'Opening settings…' : 'Open Android settings'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onRechecked}
          style={({pressed}) => [styles.secondary, pressed && {opacity: 0.7}]}>
          <Text style={styles.secondaryText}>I granted it — recheck</Text>
        </Pressable>

        <Pressable onPress={onSkip} style={styles.tertiary}>
          <Text style={styles.tertiaryText}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Bullet({text}: {text: string}) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg},
  wrap: {flex: 1, padding: spacing.xl, justifyContent: 'center'},
  eyebrow: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  h1: {
    color: colors.textPrimary,
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  body: {
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  bullets: {marginBottom: spacing.lg},
  bulletRow: {flexDirection: 'row', marginBottom: spacing.sm},
  bulletDot: {
    color: colors.accent,
    marginRight: spacing.sm,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  bulletText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    flex: 1,
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginBottom: spacing.xl,
    fontStyle: 'italic',
  },
  primary: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryText: {
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  secondary: {
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accentBorder,
    marginBottom: spacing.md,
  },
  secondaryText: {color: colors.accent, fontSize: fontSizes.md, fontWeight: '600'},
  tertiary: {paddingVertical: spacing.md, alignItems: 'center'},
  tertiaryText: {color: colors.textMuted, fontSize: fontSizes.sm},
});
