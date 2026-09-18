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
import { colors } from '../theme/colors';
import { BentoSummary } from '../components/BentoSummary';
import { ProgressBar } from '../components/ProgressBar';
import { Toast } from '../components/Toast';
import { DailyLogRepository } from '../database/repository';
import { AIService } from '../services/aiService';

interface DailyLogScreenProps {
  onDataChanged?: () => void;
}

export const DailyLogScreen: React.FC<DailyLogScreenProps> = ({ onDataChanged }) => {
  const [selectedDay, setSelectedDay] = useState<'today' | 'yesterday'>('today');
  const [calories, setCalories] = useState<number>(1650);
  const [notes, setNotes] = useState<string>('Menú nutritivo & colación liviana');
  const [loading, setLoading] = useState<boolean>(true);
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const targetCalories = 1800;
  const maxReference = 2400;

  // Helper to format date string YYYY-MM-DD
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

  // Load record from SQLite when selectedDay changes
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
        if (record.notes) setNotes(record.notes);
      } else {
        // Defaults
        setCalories(day === 'today' ? 1650 : 1720);
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
    try {
      await DailyLogRepository.saveLog(
        currentDateStr,
        calories,
        targetCalories,
        notes
      );
      setToastMessage(
        selectedDay === 'today'
          ? '¡Registro de hoy guardado exitosamente!'
          : '¡Registro de ayer actualizado!'
      );
      setToastVisible(true);
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo guardar el registro: ' + err?.message);
    }
  };

  const diff = calories - targetCalories;
  const isDeficit = diff <= 0;
  const absDiff = Math.abs(diff);
  const mindfulTip = AIService.getTipForCalories(calories, targetCalories);

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

        {/* Section Title */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={styles.mainHeading}>Registro Diario</Text>
            <View style={styles.geminiBadge}>
              <MaterialIcons name="auto-awesome" size={14} color={colors.onPrimaryFixed} />
              <Text style={styles.geminiBadgeText}>Gemini AI</Text>
            </View>
          </View>
          <Text style={styles.subHeading}>
            Carga el estimado calórico calculado por Gemini o ingresa el tuyo.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Hero Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <Text style={styles.heroLabel}>TOTAL CONSUMIDO</Text>
                <View style={styles.syncTag}>
                  <View style={styles.syncDot} />
                  <Text style={styles.syncText}>Sincronizado</Text>
                </View>
              </View>

              {/* Massive Calorie Counter */}
              <View style={styles.counterRow}>
                <TextInput
                  style={styles.calorieInput}
                  value={calories.toString()}
                  onChangeText={(val) => {
                    const num = parseInt(val, 10);
                    setCalories(isNaN(num) ? 0 : num);
                  }}
                  keyboardType="numeric"
                  maxLength={5}
                />
                <Text style={styles.calorieUnit}>kcal</Text>
              </View>

              {/* Steppers */}
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => handleAdjust(-50)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="remove" size={18} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
                <Text style={styles.stepperLabel}>Ajuste rápido</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => handleAdjust(50)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="add" size={18} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              {/* Dynamic Status Pill */}
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: isDeficit
                      ? colors.secondaryContainer
                      : colors.tertiaryFixed,
                  },
                ]}
              >
                <View style={styles.statusPillLeft}>
                  <MaterialIcons
                    name={isDeficit ? 'check-circle' : 'info'}
                    size={18}
                    color={isDeficit ? colors.secondary : colors.tertiary}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      {
                        color: isDeficit
                          ? colors.onSecondaryFixedVariant
                          : colors.onTertiaryFixedVariant,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {isDeficit
                      ? `En déficit (-${absDiff} kcal del umbral)`
                      : `Superávit (+${absDiff} kcal sobre umbral)`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.goalBadge,
                    {
                      backgroundColor: isDeficit
                        ? colors.secondaryFixed
                        : colors.tertiaryContainer,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.goalBadgeText,
                      {
                        color: isDeficit
                          ? colors.onSecondaryFixed
                          : colors.onTertiaryContainer,
                      },
                    ]}
                  >
                    {isDeficit ? 'Meta Lograda' : 'Sobre Meta'}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <ProgressBar
                consumed={calories}
                target={targetCalories}
                maxReference={maxReference}
              />
            </View>

            {/* Companion Meal Card */}
            <View style={styles.mealCard}>
              <View style={styles.mealImagePlaceholder}>
                <MaterialIcons name="restaurant" size={28} color={colors.primary} />
              </View>
              <View style={styles.mealInfo}>
                <View style={styles.mealTop}>
                  <Text style={styles.mealTag}>LECTURA ESTIMADA</Text>
                  <Text style={styles.mealTime}>14:30 hs</Text>
                </View>
                <Text style={styles.mealTitle} numberOfLines={1}>
                  {notes}
                </Text>
                <Text style={styles.mealSub}>Cálculo de porciones procesado por IA</Text>
              </View>
            </View>

            {/* Daily Summary Bento */}
            <BentoSummary target={targetCalories} consumed={calories} />

            {/* Gemini Mindful Tip */}
            <View style={styles.tipCard}>
              <View style={styles.tipIconCircle}>
                <MaterialIcons name="psychology" size={18} color={colors.primary} />
              </View>
              <View style={styles.tipContent}>
                <View style={styles.tipTitleRow}>
                  <Text style={styles.tipTitle}>Nota consciente de Gemini</Text>
                  <MaterialIcons name="verified" size={13} color={colors.primary} />
                </View>
                <Text style={styles.tipText}>{mindfulTip}</Text>
              </View>
            </View>

            {/* Action Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <MaterialIcons name="cloud-done" size={20} color={colors.onPrimary} />
              <Text style={styles.saveButtonText}>
                {selectedDay === 'today'
                  ? 'Guardar Registro de Hoy'
                  : 'Guardar Registro de Ayer'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Confirmation Toast */}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
    maxWidth: 540,
    marginHorizontal: 'auto',
    width: '100%',
  },
  daySelectorContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 30,
    padding: 4,
    marginBottom: 16,
  },
  dayTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTabActive: {
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  dayTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  dayTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  titleSection: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  geminiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  geminiBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onPrimaryFixed,
  },
  subHeading: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  heroCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#665576',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  syncTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  syncText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.onSecondaryFixed,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 4,
  },
  calorieInput: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: -1,
    textAlign: 'center',
    minWidth: 140,
    padding: 0,
  },
  calorieUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 6,
    marginBottom: 16,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 30,
    marginBottom: 10,
  },
  statusPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  goalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  goalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  mealCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 12,
  },
  mealImagePlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: {
    flex: 1,
  },
  mealTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  mealTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  mealTime: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  mealTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
  mealSub: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  tipCard: {
    backgroundColor: 'rgba(225, 227, 221, 0.6)',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginVertical: 10,
  },
  tipIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
  },
  tipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  tipText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 2,
  },
  saveButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
