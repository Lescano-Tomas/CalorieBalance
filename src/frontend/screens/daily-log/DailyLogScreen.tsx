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
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/frontend/theme';
import { Card, Button, StatusBadge } from '@/frontend/components/ui';
import { ProgressBar } from '@/frontend/components/metrics';
import { Toast } from '@/frontend/components/common';
import { DailyLogRepository, UserProfileRepository } from '@/data/repositories';
import { CalorieCalculator } from '@/backend/calculations/calorieCalculator';
import { UserProfile } from '@/types';

interface DailyLogScreenProps {
  onDataChanged?: () => void;
  userProfile?: UserProfile | null;
}

export const DailyLogScreen: React.FC<DailyLogScreenProps> = ({
  onDataChanged,
  userProfile,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [calories, setCalories] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const targetCalories = userProfile?.target_calories || 1800;
  const maxReference = Math.round(targetCalories * 1.35);

  const formatDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
  };

  const currentDateStr = formatDateStr(currentDate);

  const isToday = (d: Date) => {
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const isYesterday = (d: Date) => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return (
      d.getDate() === y.getDate() &&
      d.getMonth() === y.getMonth() &&
      d.getFullYear() === y.getFullYear()
    );
  };

  const getDateLabel = (d: Date) => {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const dayNum = d.getDate();
    const monthStr = monthNames[d.getMonth()];

    if (isToday(d)) {
      return `Hoy, ${dayNum} de ${monthStr}`;
    }
    if (isYesterday(d)) {
      return `Ayer, ${dayNum} de ${monthStr}`;
    }
    return `${dayNames[d.getDay()]} ${dayNum} de ${monthStr}`;
  };

  useEffect(() => {
    loadLogForDate(currentDate);
  }, [currentDate, userProfile]);

  const loadLogForDate = async (d: Date) => {
    setLoading(true);
    try {
      const dateStr = formatDateStr(d);
      const record = await DailyLogRepository.getByDate(dateStr);
      if (record) {
        setCalories(record.calories_consumed);
      } else {
        // Default to 0 or target if empty
        setCalories(0);
      }
    } catch (err) {
      console.error('Error loading log:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustDate = (deltaDays: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + deltaDays);
    // Don't allow navigating into the future
    const now = new Date();
    if (nextDate > now && !isToday(nextDate)) {
      return;
    }
    setCurrentDate(nextDate);
  };

  const handleReturnToToday = () => {
    setCurrentDate(new Date());
  };

  const handleAdjustCalories = (delta: number) => {
    setCalories((prev) => Math.max(0, prev + delta));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await DailyLogRepository.saveLog(
        currentDateStr,
        calories,
        targetCalories,
        undefined,
        userProfile?.id
      );
      setToastMessage(
        isToday(currentDate)
          ? `¡Guardado! ${calories.toLocaleString()} kcal registradas hoy`
          : `¡Actualizado! ${calories.toLocaleString()} kcal para ${getDateLabel(currentDate)}`
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
        {/* Sleek Date Navigator: < Hoy, 20 de Septiembre > */}
        <View style={styles.dateNavigatorContainer}>
          <TouchableOpacity
            style={styles.navArrowButton}
            onPress={() => handleAdjustDate(-1)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="chevron-left" size={26} color={colors.onSurface} />
          </TouchableOpacity>

          <View style={styles.dateCenterBlock}>
            <Text style={styles.dateHeading}>{getDateLabel(currentDate)}</Text>
            {!isToday(currentDate) && (
              <TouchableOpacity
                style={styles.returnTodayChip}
                onPress={handleReturnToToday}
                activeOpacity={0.8}
              >
                <MaterialIcons name="today" size={12} color={colors.primary} />
                <Text style={styles.returnTodayText}>Volver a hoy</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.navArrowButton, isToday(currentDate) && styles.navArrowDisabled]}
            onPress={() => handleAdjustDate(1)}
            disabled={isToday(currentDate)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="chevron-right"
              size={26}
              color={isToday(currentDate) ? colors.outlineVariant : colors.onSurface}
            />
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
                  onPress={() => handleAdjustCalories(-100)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.nudgeChipText}>-100</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.nudgeChip}
                  onPress={() => handleAdjustCalories(-50)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.nudgeChipText}>-50</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.nudgeChip, styles.nudgeChipPositive]}
                  onPress={() => handleAdjustCalories(50)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.nudgeChipText, styles.nudgeChipPositiveText]}>+50</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.nudgeChip, styles.nudgeChipPositive]}
                  onPress={() => handleAdjustCalories(100)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.nudgeChipText, styles.nudgeChipPositiveText]}>+100</Text>
                </TouchableOpacity>
              </View>

              {/* Subtle Progress Bar with Dynamic Target */}
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
                    ? `Te quedan ${absDiff.toLocaleString()} kcal para tu meta (${targetCalories.toLocaleString()} kcal)`
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
  dateNavigatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: spacing.lg,
  },
  navArrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  navArrowDisabled: {
    opacity: 0.35,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  dateCenterBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  returnTodayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: spacing.radius.pill,
    marginTop: 2,
  },
  returnTodayText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
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
