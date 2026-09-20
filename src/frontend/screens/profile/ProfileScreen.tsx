import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/frontend/theme';
import { Card, Button } from '@/frontend/components/ui';
import { UserProfile, ActivityLevel, GoalCategory, UserHabit } from '@/types';
import { UserProfileRepository, FoodMemoryRepository, HabitRepository } from '@/data/repositories';
import { NutritionCalculator } from '@/backend/calculations/nutritionCalculator';

interface ProfileScreenProps {
  userProfile: UserProfile | null;
  onProfileUpdated: (updated: UserProfile) => void;
  onOpenOnboarding: () => void;
}

const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; desc: string }> = {
  sedentary: { label: 'Sedentario', desc: 'Poco o ningún ejercicio' },
  light: { label: 'Ligero', desc: 'Ejercicio 1-3 días/sem' },
  moderate: { label: 'Moderado', desc: 'Ejercicio 3-5 días/sem' },
  active: { label: 'Activo', desc: 'Ejercicio 6-7 días/sem' },
  very_active: { label: 'Muy Activo', desc: 'Atleta o doble turno' },
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userProfile,
  onProfileUpdated,
  onOpenOnboarding,
}) => {
  const [editingTargetModal, setEditingTargetModal] = useState<boolean>(false);
  const [editingWeightModal, setEditingWeightModal] = useState<boolean>(false);
  const [tempTarget, setTempTarget] = useState<string>('');
  const [tempWeight, setTempWeight] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [memoriesCount, setMemoriesCount] = useState<number>(0);
  const [habits, setHabits] = useState<UserHabit[]>([]);

  useEffect(() => {
    loadMemoriesAndHabits();
  }, []);

  const loadMemoriesAndHabits = async () => {
    try {
      const memories = await FoodMemoryRepository.getAllMemories(200);
      setMemoriesCount(memories.length);
      const habitsList = await HabitRepository.getAllHabits();
      setHabits(habitsList);
    } catch {
      setMemoriesCount(0);
      setHabits([]);
    }
  };

  const handleToggleHabit = async (habit: UserHabit) => {
    try {
      await HabitRepository.toggleHabit(habit.id, habit.is_active === 1);
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habit.id ? { ...h, is_active: h.is_active === 1 ? 0 : 1 } : h
        )
      );
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo cambiar el estado del hábito: ' + e?.message);
    }
  };

  const handleDeleteHabit = async (id: number) => {
    try {
      await HabitRepository.deleteHabit(id);
      setHabits((prev) => prev.filter((h) => h.id !== id));
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo eliminar el hábito: ' + e?.message);
    }
  };

  if (!userProfile) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="account-circle" size={64} color={colors.outlineVariant} />
        <Text style={styles.noProfileTitle}>Sin Perfil Configurado</Text>
        <Text style={styles.noProfileSubtitle}>
          Configurá tu perfil inicial para calcular tus calorías objetivo y metabolismo basal.
        </Text>
        <Button
          label="Comenzar Asistente Inicial"
          onPress={onOpenOnboarding}
          icon="auto-awesome"
          style={styles.btnFull}
        />
      </View>
    );
  }

  // Derived metrics
  const targetCalories = userProfile.target_calories || 1800;
  const tdee = userProfile.tdee || 2000;
  const bmr = userProfile.bmr || 1400;
  const delta = tdee - targetCalories;
  const isDeficit = delta > 0;
  const isSurplus = delta < 0;

  // Quick adjust +/- 50 kcal
  const handleQuickAdjustCalories = async (deltaKcal: number) => {
    const newTarget = Math.max(800, targetCalories + deltaKcal);
    try {
      await UserProfileRepository.updateTargetCalories(userProfile.id, newTarget);
      onProfileUpdated({
        ...userProfile,
        target_calories: newTarget,
        updated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo actualizar la meta: ' + err?.message);
    }
  };

  // Save manual target calories
  const handleSaveManualTarget = async () => {
    const val = parseInt(tempTarget, 10);
    if (isNaN(val) || val < 800 || val > 6000) {
      Alert.alert('Valor inválido', 'Por favor ingresá un valor entre 800 y 6.000 kcal.');
      return;
    }

    setSaving(true);
    try {
      await UserProfileRepository.updateTargetCalories(userProfile.id, val);
      onProfileUpdated({
        ...userProfile,
        target_calories: val,
        updated_at: new Date().toISOString(),
      });
      setEditingTargetModal(false);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo guardar la meta: ' + err?.message);
    } finally {
      setSaving(false);
    }
  };

  // Save weight update
  const handleSaveWeight = async () => {
    const val = parseFloat(tempWeight.replace(',', '.'));
    if (isNaN(val) || val < 30 || val > 250) {
      Alert.alert('Peso inválido', 'Por favor ingresá un peso realista (entre 30 y 250 kg).');
      return;
    }

    setSaving(true);
    try {
      // Recalculate BMR and TDEE with new weight
      const newBmr = NutritionCalculator.calculateBMR(
        userProfile.gender,
        val,
        userProfile.height_cm,
        userProfile.age
      );
      const newTdee = NutritionCalculator.calculateTDEE(newBmr, userProfile.activity_level);

      await UserProfileRepository.updateProfile(userProfile.id, {
        weight_kg: val,
        bmr: newBmr,
        tdee: newTdee,
      });

      onProfileUpdated({
        ...userProfile,
        weight_kg: val,
        bmr: newBmr,
        tdee: newTdee,
        updated_at: new Date().toISOString(),
      });
      setEditingWeightModal(false);
      Alert.alert(
        'Peso actualizado',
        `Nuevo peso: ${val} kg. Tu metabolismo basal (TMB: ${newBmr} kcal) y gasto diario (TDEE: ${newTdee} kcal) se actualizaron automáticamente.`
      );
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo actualizar el peso: ' + err?.message);
    } finally {
      setSaving(false);
    }
  };

  // Switch activity level
  const handleSelectActivity = async (level: ActivityLevel) => {
    if (level === userProfile.activity_level) return;
    try {
      const newTdee = NutritionCalculator.calculateTDEE(bmr, level);
      await UserProfileRepository.updateProfile(userProfile.id, {
        activity_level: level,
        tdee: newTdee,
      });
      onProfileUpdated({
        ...userProfile,
        activity_level: level,
        tdee: newTdee,
        updated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo cambiar la actividad: ' + err?.message);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Hero Identity Card */}
      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarInitial}>
              {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.userName}>{userProfile.name || 'Mi Perfil'}</Text>
            <Text style={styles.userSub}>
              {userProfile.gender === 'female' ? 'Mujer' : 'Hombre'} • {userProfile.age} años •{' '}
              {userProfile.height_cm} cm
            </Text>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.goalBadge,
                  isDeficit
                    ? styles.badgeDeficit
                    : isSurplus
                    ? styles.badgeSurplus
                    : styles.badgeMaintenance,
                ]}
              >
                <MaterialIcons
                  name={isDeficit ? 'trending-down' : isSurplus ? 'trending-up' : 'horizontal-rule'}
                  size={14}
                  color={
                    isDeficit
                      ? colors.secondary
                      : isSurplus
                      ? colors.tertiary
                      : colors.primary
                  }
                />
                <Text
                  style={[
                    styles.goalBadgeText,
                    {
                      color: isDeficit
                        ? colors.secondary
                        : isSurplus
                        ? colors.tertiary
                        : colors.primary,
                    },
                  ]}
                >
                  {isDeficit
                    ? `Déficit de -${delta} kcal/día`
                    : isSurplus
                    ? `Superávit de +${Math.abs(delta)} kcal/día`
                    : 'Mantenimiento exacto'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Card>

      {/* 2. Bento Card: Metabolic & Target Calorie Dashboard */}
      <View style={styles.sectionHeader}>
        <MaterialIcons name="insights" size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>Balance & Metabolismo</Text>
      </View>

      <Card style={styles.bentoMainCard}>
        <View style={styles.targetCaloriesHeader}>
          <View>
            <Text style={styles.targetLabel}>Meta Diaria Actual</Text>
            <Text style={styles.targetValue}>
              {targetCalories.toLocaleString()}{' '}
              <Text style={styles.targetUnit}>kcal / día</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.editTargetBtn}
            onPress={() => {
              setTempTarget(String(targetCalories));
              setEditingTargetModal(true);
            }}
          >
            <MaterialIcons name="edit" size={16} color={colors.primary} />
            <Text style={styles.editTargetBtnText}>Editar</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Adjustment Pills */}
        <View style={styles.quickAdjustRow}>
          <Text style={styles.quickAdjustLabel}>Ajuste rápido:</Text>
          <View style={styles.quickButtonsGroup}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => handleQuickAdjustCalories(-50)}
            >
              <Text style={styles.quickBtnText}>-50 kcal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => handleQuickAdjustCalories(+50)}
            >
              <Text style={styles.quickBtnText}>+50 kcal</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Metabolic Breakdown Row */}
        <View style={styles.metabolicRow}>
          <View style={styles.metabolicCol}>
            <Text style={styles.metabolicVal}>{tdee.toLocaleString()}</Text>
            <Text style={styles.metabolicLabel}>TDEE (Gasto Diario)</Text>
            <Text style={styles.metabolicDesc}>Calorías que quemás hoy</Text>
          </View>

          <View style={styles.metabolicDivider} />

          <View style={styles.metabolicCol}>
            <Text style={styles.metabolicVal}>{bmr.toLocaleString()}</Text>
            <Text style={styles.metabolicLabel}>TMB (Basal)</Text>
            <Text style={styles.metabolicDesc}>Tu gasto en reposo total</Text>
          </View>
        </View>
      </Card>

      {/* 3. Body Metrics & Weight Log Card */}
      <View style={styles.sectionHeader}>
        <MaterialIcons name="straighten" size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>Métricas Corporales</Text>
      </View>

      <Card style={styles.metricsCard}>
        <View style={styles.metricItemRow}>
          <View style={styles.metricItemLeft}>
            <View style={styles.metricIconBox}>
              <MaterialIcons name="monitor-weight" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.metricItemTitle}>Peso Registrado</Text>
              <Text style={styles.metricItemValue}>{userProfile.weight_kg} kg</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.updateWeightBtn}
            onPress={() => {
              setTempWeight(String(userProfile.weight_kg));
              setEditingWeightModal(true);
            }}
          >
            <MaterialIcons name="edit" size={15} color={colors.onPrimary} />
            <Text style={styles.updateWeightBtnText}>Actualizar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.activitySection}>
          <Text style={styles.activityTitle}>Nivel de Actividad Física Habitual:</Text>
          <View style={styles.activityChipsContainer}>
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((lvl) => {
              const active = userProfile.activity_level === lvl;
              return (
                <TouchableOpacity
                  key={lvl}
                  style={[styles.activityChip, active && styles.activityChipActive]}
                  onPress={() => handleSelectActivity(lvl)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.activityChipLabel,
                      active && styles.activityChipLabelActive,
                    ]}
                  >
                    {ACTIVITY_LABELS[lvl].label}
                  </Text>
                  <Text
                    style={[
                      styles.activityChipSub,
                      active && styles.activityChipSubActive,
                    ]}
                  >
                    {ACTIVITY_LABELS[lvl].desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Card>

      {/* 4. AI Vector Memory & Habits Status */}
      <View style={styles.sectionHeader}>
        <MaterialIcons name="auto-awesome" size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>Inteligencia & Memoria de Hábitos</Text>
      </View>

      <Card style={styles.aiMemoryCard}>
        <View style={styles.aiMemoryHeader}>
          <View style={styles.aiMemoryIconBox}>
            <MaterialIcons name="psychology" size={20} color={colors.secondary} />
          </View>
          <View style={styles.aiMemoryInfo}>
            <Text style={styles.aiMemoryTitle}>Base de Conocimiento Personal</Text>
            <Text style={styles.aiMemoryCount}>
              {memoriesCount} {memoriesCount === 1 ? 'plato aprendido' : 'platos aprendidos'}
            </Text>
          </View>
        </View>
        <Text style={styles.aiMemoryDesc}>
          Groq y Google Gemini utilizan esta memoria en SQLite para adaptar automáticamente los
          gramajes, aceites y hábitos a la forma exacta en que cocinás.
        </Text>

        {habits.length > 0 && (
          <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.outline, letterSpacing: 0.5 }}>
              HÁBITOS & PREFERENCIAS REGISTRADAS:
            </Text>
            {habits.map((h) => {
              const isActive = h.is_active === 1;
              return (
                <View
                  key={h.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isActive ? '#ffffff' : colors.surfaceContainer,
                    padding: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: isActive ? colors.primaryFixedDim : 'transparent',
                  }}
                >
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    onPress={() => handleToggleHabit(h)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={isActive ? 'check-circle' : 'radio-button-unchecked'}
                      size={18}
                      color={isActive ? colors.primary : colors.outline}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: isActive ? colors.onSurface : colors.outline,
                        }}
                      >
                        {h.title}
                      </Text>
                      {!!h.description && (
                        <Text style={{ fontSize: 10.5, color: colors.outline }} numberOfLines={1}>
                          {h.description}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteHabit(h.id)}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <MaterialIcons name="delete-outline" size={16} color={colors.outline} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* 5. Guided Assistant Trigger */}
      <View style={styles.toolsSection}>
        <TouchableOpacity
          style={styles.recalculateBtn}
          onPress={onOpenOnboarding}
          activeOpacity={0.8}
        >
          <MaterialIcons name="restart-alt" size={20} color={colors.primary} />
          <Text style={styles.recalculateBtnText}>Recalcular con Asistente Inicial</Text>
        </TouchableOpacity>
        <Text style={styles.recalculateHelp}>
          Permite rehacer paso a paso el cálculo de objetivos y fórmulas nutricionales.
        </Text>
      </View>

      {/* Spacer for bottom nav */}
      <View style={{ height: 80 }} />

      {/* Modal: Edit Target Calories */}
      <Modal
        visible={editingTargetModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingTargetModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar Meta Calórica</Text>
            <Text style={styles.modalSubtitle}>
              Ingresá directamente tu objetivo diario de calorías.
            </Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={tempTarget}
              onChangeText={setTempTarget}
              placeholder="ej. 1650"
              placeholderTextColor={colors.outlineVariant}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditingTargetModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSaveManualTarget}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={styles.modalConfirmText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Edit Weight */}
      <Modal
        visible={editingWeightModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingWeightModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Actualizar Peso Actual</Text>
            <Text style={styles.modalSubtitle}>
              Al guardar, se recalcularán automáticamente tu TMB y TDEE para mantener tus métricas
              al día.
            </Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="decimal-pad"
              value={tempWeight}
              onChangeText={setTempWeight}
              placeholder="ej. 61.5"
              placeholderTextColor={colors.outlineVariant}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditingWeightModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSaveWeight}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={styles.modalConfirmText}>Actualizar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  noProfileTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  noProfileSubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  btnFull: {
    width: '100%',
    marginTop: spacing.md,
  },
  heroCard: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
  },
  heroInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onSurface,
  },
  userSub: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: spacing.radius.pill,
  },
  badgeDeficit: {
    backgroundColor: colors.secondaryContainer,
  },
  badgeSurplus: {
    backgroundColor: colors.tertiaryContainer,
  },
  badgeMaintenance: {
    backgroundColor: colors.primaryFixed,
  },
  goalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bentoMainCard: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.lg,
    gap: spacing.md,
  },
  targetCaloriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetLabel: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  targetValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  targetUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  editTargetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: spacing.radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  editTargetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  quickAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickAdjustLabel: {
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
  },
  quickButtonsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
  },
  metabolicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metabolicCol: {
    flex: 1,
    alignItems: 'center',
  },
  metabolicDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.surfaceContainer,
  },
  metabolicVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.onSurface,
  },
  metabolicLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  metabolicDesc: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 2,
  },
  metricsCard: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.lg,
    gap: spacing.md,
  },
  metricItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricItemTitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  metricItemValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.onSurface,
  },
  updateWeightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: spacing.radius.md,
  },
  updateWeightBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  activitySection: {
    gap: 8,
  },
  activityTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  activityChipsContainer: {
    gap: 6,
  },
  activityChip: {
    padding: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  activityChipActive: {
    backgroundColor: colors.primaryFixed,
    borderColor: colors.primary,
  },
  activityChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  activityChipLabelActive: {
    color: colors.primary,
  },
  activityChipSub: {
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  activityChipSubActive: {
    color: colors.onSurface,
  },
  aiMemoryCard: {
    padding: spacing.lg,
    backgroundColor: colors.secondaryContainer,
    borderRadius: spacing.radius.lg,
    gap: 8,
  },
  aiMemoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiMemoryIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiMemoryInfo: {
    flex: 1,
  },
  aiMemoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSecondaryContainer,
  },
  aiMemoryCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  aiMemoryDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.onSecondaryContainer,
  },
  toolsSection: {
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  recalculateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  recalculateBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.primary,
  },
  recalculateHelp: {
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.xl,
    padding: spacing.lg,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  modalInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.primaryFixedDim,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  modalConfirmBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
