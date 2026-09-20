import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/frontend/theme';
import { StatusBadge } from '../ui/StatusBadge';

interface HeaderProps {
  subtitle: string;
  isDeficit?: boolean;
  onPressProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  subtitle,
  isDeficit = true,
  onPressProfile,
}) => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftSection}>
        <View style={styles.logoCircle}>
          <MaterialIcons name="monitor-heart" size={20} color={colors.primary} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.appName}>CalorieBalance</Text>
          <Text style={styles.screenSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <StatusBadge isDeficit={isDeficit} text={isDeficit ? 'En balance' : 'Superávit'} />

        <TouchableOpacity
          style={styles.avatarButton}
          activeOpacity={0.8}
          onPress={onPressProfile}
        >
          <MaterialIcons name="person" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 60,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flexDirection: 'column',
  },
  appName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
