import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, fontSizes, radii, spacing} from '../theme/colors';

type Props = {label: string; tone?: 'ok' | 'warn' | 'danger' | 'muted'};

export default function StatusPill({label, tone = 'muted'}: Props) {
  const dotColor =
    tone === 'ok'
      ? colors.ok
      : tone === 'warn'
      ? colors.warn
      : tone === 'danger'
      ? colors.danger
      : colors.textMuted;
  return (
    <View style={styles.wrap}>
      <View style={[styles.dot, {backgroundColor: dotColor}]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  dot: {width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm},
  label: {color: colors.textPrimary, fontSize: fontSizes.sm},
});
