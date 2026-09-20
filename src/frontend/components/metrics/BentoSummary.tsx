import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/frontend/theme';
import { CalorieCalculator } from '@/backend/calculations/calorieCalculator';

interface BentoSummaryProps {
  target: number;
  consumed: number;
}

export const BentoSummary: React.FC<BentoSummaryProps> = ({
  target = 1800,
  consumed,
}) => {
  const { diff, isDeficit, absDiff } = CalorieCalculator.calculateDeficit(consumed, target);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RESUMEN DEL DÍA</Text>
      <View style={styles.grid}>
        {/* Card 1: Umbral */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Umbral</Text>
          <Text style={styles.cardValue}>{target.toLocaleString()}</Text>
          <Text style={styles.cardUnit}>kcal</Text>
        </View>

        {/* Card 2: Consumo */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Consumo</Text>
          <Text style={[styles.cardValue, { color: colors.primary }]}>
            {consumed.toLocaleString()}
          </Text>
          <Text style={styles.cardUnit}>kcal</Text>
        </View>

        {/* Card 3: Déficit o Superávit */}
        <View style={styles.card}>
          <Text
            style={[
              styles.cardLabel,
              { color: isDeficit ? colors.secondary : colors.tertiary },
            ]}
          >
            {isDeficit ? 'Déficit' : 'Superávit'}
          </Text>
          <Text
            style={[
              styles.cardValue,
              { color: isDeficit ? colors.secondary : colors.tertiary },
            ]}
          >
            {isDeficit ? `-${absDiff.toLocaleString()}` : `+${absDiff.toLocaleString()}`}
          </Text>
          <Text style={styles.cardUnit}>kcal</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    marginVertical: 10,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 4,
  },
  cardUnit: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});
