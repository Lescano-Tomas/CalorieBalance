import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Toast } from '../components/Toast';
import { DailyLogRepository } from '../database/repository';
import { AIService } from '../services/aiService';
import { DailyLog } from '../types';

interface HistoryScreenProps {
  onDataChanged?: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onDataChanged }) => {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(true);
  const [selectedRetroDate, setSelectedRetroDate] = useState<string>('');
  const [retroCalories, setRetroCalories] = useState<string>('1510');
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());

  // Generate past 7 days for the horizontal chips
  const generatePastDays = () => {
    const days = [];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    for (let i = 7; i >= 1; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      days.push({
        dateStr,
        dayNumber: d.getDate(),
        dayName: dayNames[d.getDay()],
      });
    }
    return days;
  };

  const pastDays = generatePastDays();

  useEffect(() => {
    if (pastDays.length > 0 && !selectedRetroDate) {
      setSelectedRetroDate(pastDays[pastDays.length - 1].dateStr);
    }
    loadHistory();
  }, [currentMonthDate]);

  const loadHistory = async () => {
    try {
      const all = await DailyLogRepository.getAllLogs();
      setLogs(all);
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const handleSaveRetro = async () => {
    const cal = parseInt(retroCalories, 10);
    if (isNaN(cal) || cal <= 0) {
      Alert.alert('Calorías inválidas', 'Por favor ingresa un número de calorías válido.');
      return;
    }

    try {
      await DailyLogRepository.saveLog(
        selectedRetroDate,
        cal,
        1800,
        'Registro retroactivo auditado'
      );
      setToastMessage(`¡Día ${selectedRetroDate} guardado con éxito!`);
      setToastVisible(true);
      loadHistory();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo guardar el día: ' + err?.message);
    }
  };

  const handleDelete = async (id: number, date: string) => {
    Alert.alert(
      'Eliminar Registro',
      `¿Deseas eliminar el registro del día ${date}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await DailyLogRepository.deleteLog(id);
            setToastMessage('Registro eliminado');
            setToastVisible(true);
            loadHistory();
            if (onDataChanged) onDataChanged();
          },
        },
      ]
    );
  };

  const handleReestimate = async () => {
    const res = await AIService.estimateCalories(retroCalories);
    setRetroCalories(res.estimatedCalories.toString());
    setToastMessage(`IA sugirió: ${res.estimatedCalories} kcal`);
    setToastVisible(true);
  };

  const changeMonth = (delta: number) => {
    const next = new Date(currentMonthDate);
    next.setMonth(next.getMonth() + delta);
    setCurrentMonthDate(next);
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const monthDisplay = `${monthNames[currentMonthDate.getMonth()]} ${currentMonthDate.getFullYear()}`;

  // Filter logs for the active month view
  const filteredLogs = logs.filter((log) => {
    const logDate = new Date(log.date);
    return (
      logDate.getFullYear() === currentMonthDate.getFullYear() &&
      logDate.getMonth() === currentMonthDate.getMonth()
    );
  });

  const totalLogs = logs.length;
  const deficitLogs = logs.filter((l) => l.calories_consumed <= l.target_calories).length;
  const deficitPercentage = totalLogs > 0 ? Math.round((deficitLogs / totalLogs) * 100) : 100;

  const currentCalNum = parseInt(retroCalories, 10) || 0;
  const retroDiff = currentCalNum - 1800;
  const isRetroDeficit = retroDiff <= 0;

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Narrative Header */}
        <View style={styles.headerSection}>
          <View style={styles.badgeRow}>
            <MaterialIcons name="auto-stories" size={14} color={colors.onPrimaryFixedVariant} />
            <Text style={styles.badgeText}>BITÁCORA NUTRICIONAL</Text>
          </View>
          <Text style={styles.mainTitle}>Historial y Días Pasados</Text>
          <Text style={styles.subTitle}>Consulta registros anteriores o añade un día pendiente</Text>
        </View>

        {/* Collapsible Module: Registrar Día Pasado */}
        <View style={styles.accordionCard}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setIsAccordionOpen(!isAccordionOpen)}
            activeOpacity={0.7}
          >
            <View style={styles.accordionHeaderLeft}>
              <View style={styles.historyEduIcon}>
                <MaterialIcons name="history-edu" size={22} color={colors.onSecondaryContainer} />
              </View>
              <View>
                <Text style={styles.accordionTitle}>Registrar Día Pasado</Text>
                <Text style={styles.accordionSub}>Completa un día sin registro pendiente</Text>
              </View>
            </View>
            <View style={styles.accordionIconCircle}>
              <MaterialIcons
                name={isAccordionOpen ? 'expand-less' : 'expand-more'}
                size={22}
                color={colors.onSurfaceVariant}
              />
            </View>
          </TouchableOpacity>

          {isAccordionOpen && (
            <View style={styles.accordionBody}>
              <Text style={styles.fieldLabel}>Selecciona la fecha pendiente</Text>

              {/* Horizontal chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                {pastDays.map((d) => {
                  const isSelected = selectedRetroDate === d.dateStr;
                  return (
                    <TouchableOpacity
                      key={d.dateStr}
                      style={[
                        styles.dayChip,
                        isSelected && styles.dayChipActive,
                      ]}
                      onPress={() => setSelectedRetroDate(d.dateStr)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.chipDayName,
                          isSelected && styles.chipDayNameActive,
                        ]}
                      >
                        {d.dayName}
                      </Text>
                      <Text
                        style={[
                          styles.chipDayNumber,
                          isSelected && styles.chipDayNumberActive,
                        ]}
                      >
                        {d.dayNumber}
                      </Text>
                      <View
                        style={[
                          styles.chipDot,
                          {
                            backgroundColor: isSelected
                              ? colors.secondaryFixed
                              : colors.secondary,
                          },
                        ]}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Calorie input & re-estimate */}
              <View style={styles.inputContainer}>
                <Text style={styles.fieldLabel}>Calorías estimadas</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons
                    name="local-fire-department"
                    size={20}
                    color={colors.primary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.retroInput}
                    value={retroCalories}
                    onChangeText={setRetroCalories}
                    keyboardType="numeric"
                    placeholder="ej. 1510"
                  />
                  <TouchableOpacity
                    style={styles.reestimateButton}
                    onPress={handleReestimate}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="psychology" size={14} color={colors.onPrimaryFixed} />
                    <Text style={styles.reestimateText}>Re-estimar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mini Preview Summary */}
              <View
                style={[
                  styles.previewPill,
                  {
                    backgroundColor: isRetroDeficit
                      ? colors.secondaryContainer
                      : colors.tertiaryFixed,
                  },
                ]}
              >
                <View style={styles.previewLeft}>
                  <MaterialIcons
                    name="verified"
                    size={16}
                    color={isRetroDeficit ? colors.secondary : colors.tertiary}
                  />
                  <Text style={styles.previewLabel}>Meta del día: 1.800 kcal</Text>
                </View>
                <Text
                  style={[
                    styles.previewValue,
                    { color: isRetroDeficit ? colors.secondary : colors.tertiary },
                  ]}
                >
                  {isRetroDeficit
                    ? `-${Math.abs(retroDiff)} kcal déficit`
                    : `+${retroDiff} kcal superávit`}
                </Text>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.retroSaveButton}
                onPress={handleSaveRetro}
                activeOpacity={0.85}
              >
                <MaterialIcons name="save" size={18} color={colors.onSurface} />
                <Text style={styles.retroSaveButtonText}>Guardar Día Pasado</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Visual Accent: Monthly Balance Card */}
        <View style={styles.rhythmCard}>
          <View style={styles.rhythmInfo}>
            <Text style={styles.rhythmTag}>RITMO DE AUDITORÍA</Text>
            <Text style={styles.rhythmTitle}>
              {deficitLogs} de {totalLogs} días en déficit
            </Text>
            <Text style={styles.rhythmSub}>
              {deficitPercentage}% de tus días registrados en balance consciente
            </Text>
          </View>
          <View style={styles.rhythmIconBox}>
            <MaterialIcons name="eco" size={28} color={colors.secondary} />
          </View>
        </View>

        {/* Historial Completo */}
        <View style={styles.historySection}>
          <View style={styles.monthNavBar}>
            <View>
              <Text style={styles.historyHeading}>Historial Completo</Text>
              <Text style={styles.historySub}>Tus registros diarios auditados</Text>
            </View>

            <View style={styles.monthNavControls}>
              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={() => changeMonth(-1)}
              >
                <MaterialIcons name="chevron-left" size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{monthDisplay}</Text>
              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={() => changeMonth(1)}
              >
                <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>

          {/* List of past logs */}
          {filteredLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No hay registros para este mes todavía.
              </Text>
            </View>
          ) : (
            filteredLogs.map((item) => {
              const diffVal = item.calories_consumed - item.target_calories;
              const inDeficit = diffVal <= 0;
              return (
                <View key={item.id} style={styles.logCard}>
                  <View style={styles.logLeft}>
                    <Text style={styles.logDate}>{item.date}</Text>
                    <Text style={styles.logCalories}>
                      {item.calories_consumed.toLocaleString()} kcal
                    </Text>
                  </View>

                  <View style={styles.logRight}>
                    <View
                      style={[
                        styles.logBadge,
                        {
                          backgroundColor: inDeficit
                            ? colors.secondaryContainer
                            : colors.tertiaryContainer,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.logBadgeText,
                          {
                            color: inDeficit
                              ? colors.onSecondaryContainer
                              : colors.onTertiaryContainer,
                          },
                        ]}
                      >
                        {inDeficit
                          ? `-${Math.abs(diffVal)} kcal`
                          : `+${diffVal} kcal`}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleDelete(item.id, item.date)}
                      style={styles.deleteBtn}
                    >
                      <MaterialIcons name="delete-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

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
  headerSection: {
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryFixed,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onPrimaryFixedVariant,
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  accordionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#665576',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 16,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  historyEduIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  accordionSub: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  accordionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 14,
  },
  dayChip: {
    minWidth: 62,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.05 }],
  },
  chipDayName: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  chipDayNameActive: {
    color: colors.onPrimary,
  },
  chipDayNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 2,
  },
  chipDayNumberActive: {
    color: colors.onPrimary,
  },
  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  retroInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 24,
    paddingLeft: 42,
    paddingRight: 110,
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
  },
  reestimateButton: {
    position: 'absolute',
    right: 6,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reestimateText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onPrimaryFixed,
  },
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 14,
    marginBottom: 14,
  },
  previewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurface,
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  retroSaveButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retroSaveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  rhythmCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  rhythmInfo: {
    flex: 1,
  },
  rhythmTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  rhythmTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 2,
  },
  rhythmSub: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '500',
    marginTop: 2,
  },
  rhythmIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historySection: {
    marginTop: 6,
  },
  monthNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  historyHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  historySub: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  monthNavControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    padding: 4,
    borderRadius: 20,
  },
  monthNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
    paddingHorizontal: 8,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  logCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  logLeft: {
    flexDirection: 'column',
  },
  logDate: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  logCalories: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 2,
  },
  logRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  logBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 4,
  },
});
