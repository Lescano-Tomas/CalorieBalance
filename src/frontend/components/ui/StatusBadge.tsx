import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/frontend/theme';

interface StatusBadgeProps {
  isDeficit: boolean;
  text?: string;
  diff?: number;
  compact?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  isDeficit,
  text,
  diff,
  compact = false,
}) => {
  const absDiff = diff !== undefined ? Math.abs(diff) : null;
  const label =
    text ||
    (isDeficit
      ? absDiff !== null
        ? `-${absDiff} kcal`
        : 'En déficit'
      : absDiff !== null
      ? `+${absDiff} kcal`
      : 'Superávit');

  return (
    <View
      style={[
        styles.badge,
        compact ? styles.compactBadge : styles.normalBadge,
        {
          backgroundColor: isDeficit
            ? colors.secondaryContainer
            : colors.tertiaryContainer,
        },
      ]}
    >
      <MaterialIcons
        name={isDeficit ? 'check-circle' : 'info'}
        size={compact ? 12 : 16}
        color={isDeficit ? colors.secondary : colors.tertiary}
      />
      <Text
        style={[
          styles.badgeText,
          compact ? styles.compactText : styles.normalText,
          {
            color: isDeficit
              ? colors.onSecondaryContainer
              : colors.onTertiaryContainer,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: spacing.radius.pill,
  },
  normalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  compactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 3,
  },
  badgeText: {
    fontWeight: '700',
  },
  normalText: {
    fontSize: 11,
  },
  compactText: {
    fontSize: 10,
  },
});
