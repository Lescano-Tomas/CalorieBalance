import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface ProgressBarProps {
  consumed: number;
  target?: number;
  maxReference?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  consumed,
  target = 1800,
  maxReference = 2400,
}) => {
  const percent = Math.min(Math.max((consumed / maxReference) * 100, 2), 100);
  const targetPercent = (target / maxReference) * 100;
  const isDeficit = consumed <= target;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.rangeLabel}>0 kcal</Text>
        <Text style={[styles.targetLabel, { color: colors.primary }]}>
          Umbral: {target.toLocaleString()} kcal
        </Text>
        <Text style={styles.rangeLabel}>{maxReference.toLocaleString()} kcal</Text>
      </View>

      <View style={styles.track}>
        {/* Progress fill */}
        <View
          style={[
            styles.fill,
            {
              width: `${percent}%`,
              backgroundColor: isDeficit
                ? colors.secondary
                : colors.tertiaryContainer,
            },
          ]}
        />

        {/* Target line indicator */}
        <View
          style={[
            styles.targetMarker,
            { left: `${targetPercent}%` },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rangeLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  targetLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  track: {
    height: 9,
    width: '100%',
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
  },
  targetMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2.5,
    backgroundColor: colors.primary,
  },
});
