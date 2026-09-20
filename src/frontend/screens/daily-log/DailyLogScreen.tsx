import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, spacing } from '@/frontend/theme';
import { Card, Button, StatusBadge } from '@/frontend/components/ui';
import { ProgressBar } from '@/frontend/components/metrics';
import { Toast } from '@/frontend/components/common';
import { DailyLogRepository } from '@/data/repositories';
import { CalorieCalculator } from '@/backend/calculations/calorieCalculator';

interface DailyLogScreenProps {
  onDataChanged?: () => void;
}

export const DailyLogScreen: React.FC<DailyLogScreenProps> = ({ onDataChanged }) => {
  const [selectedDay, setSelectedDay] = useState<'today' | 'yesterday'>('today');
  const [calories, setCalories] = useState<number>(1750);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const targetCalories = 1800;
  const maxReference = 2400;

  const getDateString = (day: 'today' | 'yesterday') => {
    const d = new Date();
    if (day === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
  };

  const currentDateStr = getDateString(selectedDay);

  useEffect(() => {
    loadLogForDay(selectedDay);
  }, [selectedDay]);

  const loadLogForDay = async (day: 'today' | 'yesterday') => {
    setLoading(true);
    try {
      const dateStr = getDateString(day);
      const record = await DailyLogRepository.getByDate(dateStr);
      if (record) {
        setCalories(record.calories_consumed);
      } else {
        setCalories(day === 'today' ? 1750 : 1720);
      }
    } catch (err) {
      console.error('Error loading log:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = (delta: number) => {
    setCalories((prev) => Math.max(0, prev + delta));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await DailyLogRepository.saveLog(
        currentDateStr,
        calories,
        targetCalories
      );
      setToastMessage(
        selectedDay === 'today'
          ? `¡Guardado! ${calories.toLocaleString()} kcal registradas hoy`
          : `¡Actualizado! ${calories.toLocaleString()} kcal registradas ayer`
      );
      setToastVisible(true);
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo guardar el registro: ' + err?.message);
    } finally {
      setSaving(false);
    }
  };

  const { isDeficit, absDiff, diff } = CalorieCalculator.calculateDeficit(
    calories,
    targetCalories,
    maxReference
  );

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Day Selector Pill Strip */}
        <View style={styles.daySelectorContainer}>
          <TouchableOpacity
            style={[
              styles.dayTab,
              selectedDay === 'yesterday' && styles.dayTabActive,
            ]}
            onPress={() => setSelectedDay('yesterday')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.dayTabText,
                selectedDay === 'yesterday' && styles.dayTabTextActive,
              ]}
            >
              Ayer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dayTab,
              selectedDay === 'today' && styles.dayTabActive,
            ]}
            onPress={() => setSelectedDay('today')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.dayTabText,
                selectedDay === 'today' && styles.dayTabTextActive,
              ]}
            >
              Hoy
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.mainFocusArea}>
            {/* Core Card */}
            <Card style={styles.heroCard}>
              {/* Header inside Card */}
              <View style={styles.heroTopRow}>
                <Text style={styles.heroLabel}>TOTAL CONSUMIDO</Text>
                <StatusBadge isDeficit={isDeficit} diff={diff} compact />
              </View>

              {/* Massive Calorie Counter */}
              <View style={styles.counterRow}>
                <TextInput
                  style={styles.calorieInput}
                  value={calories === 0 ? '' : calories.toString()}
                  placeholder="0"
                  placeholderTextColor={colors.outlineVariant}
                  onChangeText={(val) => {
                    const num = parseInt(val, 10);
                    setCalories(isNaN(num) ? 0 : num);
                  }}
                  keyboardType="numeric"
                  maxLength={5}
                  selectTextOnFocus
                />
                <Text style={styles.calorieUnit}>kcal</Text>
              </View>

              {/* Quick Nudge Adjustment Chips: -100, -50, +50, +100 */}
              <View style={styles.nudgeRow}>
                <TouchableOpacity
                  style={styles.nudgeChip}
                  onPress={() => handleAdjust(-100)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.nudgeChipText}>-100</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.nudgeChip}
                  onPress={() => handleAdjust(-50)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.nudgeChipText}>-50</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.nudgeChip, styles.nudgeChipPositive]}
                  onPress={() => handleAdjust(50)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.nudgeChipText, styles.nudgeChipPositiveText]}>+50</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.nudgeChip, styles.nudgeChipPositive]}
                  onPress={() => handleAdjust(100)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.nudgeChipText, styles.nudgeChipPositiveText]}>+100</Text>
                </TouchableOpacity>
              </View>

              {/* Subtle Progress Bar */}
              <ProgressBar
                consumed={calories}
                target={targetCalories}
                maxReference={maxReference}
              />

              {/* Direct Status Feedback Message */}
              <View style={styles.statusFooter}>
                <Text
                  style={[
                    styles.statusFooterText,
                    { color: isDeficit ? colors.secondary : colors.tertiary },
                  ]}
                >
                  {isDeficit
                    ? `Te quedan ${absDiff.toLocaleString()} kcal para tu meta (1.800 kcal)`
                    : `Superávit de +${absDiff.toLocaleString()} kcal sobre tu meta`}
                </Text>
              </View>
            </Card>

            {/* Prominent Action Button: Instant 1-tap save */}
            <View style={styles.actionContainer}>
              <Button
                label={`Guardar Registro (${calories.toLocaleString()} kcal)`}
                icon="check-circle"
                onPress={handleSave}
                loading={saving}
                style={styles.saveButton}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Confirmation Toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 110,
    maxWidth: 480,
    marginHorizontal: 'auto',
    width: '100%',
  },
  daySelectorContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
  },
  dayTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: spacing.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTabActive: {
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  dayTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  dayTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  mainFocusArea: {
    gap: spacing.lg,
  },
  heroCard: {
    padding: spacing.xl,
    backgroundColor: colors.surfaceContainerLowest,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
    marginVertical: spacing.sm,
  },
  calorieInput: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: -1,
    textAlign: 'center',
    minWidth: 150,
    padding: 0,
  },
  calorieUnit: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  nudgeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeChipPositive: {
    backgroundColor: colors.secondaryContainer,
  },
  nudgeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  nudgeChipPositiveText: {
    color: colors.onSecondaryContainer,
  },
  statusFooter: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  statusFooterText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionContainer: {
    marginTop: spacing.xs,
  },
  saveButton: {
    height: 56,
    borderRadius: spacing.radius.pill,
  },
});
