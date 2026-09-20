import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/frontend/theme';
import { ScreenType } from '@/types';

interface BottomNavProps {
  currentScreen: ScreenType;
  onSelectScreen: (screen: ScreenType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onSelectScreen,
}) => {
  const tabs: { key: ScreenType; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
    { key: 'daily', label: 'Carga Diaria', icon: 'edit-calendar' },
    { key: 'charts', label: 'Gráficos', icon: 'bar-chart' },
    { key: 'history', label: 'Historial', icon: 'history' },
    { key: 'profile', label: 'Perfil', icon: 'person' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {tabs.map((tab) => {
          const isActive = currentScreen === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                isActive && styles.activeTabButton,
              ]}
              onPress={() => onSelectScreen(tab.key)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={tab.icon}
                size={22}
                color={isActive ? colors.primary : colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.activeTabLabel,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(248, 250, 244, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(102, 85, 118, 0.08)',
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    maxWidth: 420,
    marginHorizontal: 'auto',
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: spacing.radius.md,
    gap: 3,
  },
  activeTabButton: {
    backgroundColor: colors.primaryFixed,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
});
