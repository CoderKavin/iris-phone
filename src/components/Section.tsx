import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, fontSizes, spacing} from '../theme/colors';

type Props = {
  title: string;
  count?: number;
  children?: React.ReactNode;
};

export default function Section({title, count, children}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        {typeof count === 'number' && (
          <Text style={styles.count}>{count}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {marginBottom: spacing.xl},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.accent,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  count: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
});
