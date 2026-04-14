import React from 'react';
import {View, ViewStyle, StyleSheet} from 'react-native';
import {colors, radii, spacing} from '../theme/colors';

type Props = {
  children: React.ReactNode;
  accent?: boolean;
  style?: ViewStyle;
};

export default function Card({children, accent, style}: Props) {
  return (
    <View
      style={[
        styles.card,
        accent && styles.accent,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accent: {
    borderColor: colors.accentBorder,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 0},
    elevation: 6,
  },
});
