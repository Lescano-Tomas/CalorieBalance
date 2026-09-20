import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/frontend/theme';
import { Card, Button } from '@/frontend/components/ui';
import { NutritionCalculator } from '@/backend/calculations/nutritionCalculator';
import { UserProfileRepository } from '@/data/repositories';
import {
  GenderType,
  ActivityLevel,
  GoalCategory,
  GoalIntensity,
  UserProfile,
} from '@/types';

interface OnboardingModalProps {
  visible: boolean;
  onClose?: () => void;
  onCompleted: (profile: UserProfile) => void;
  initialProfile?: UserProfile | null;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  visible,
  onClose,
  onCompleted,
  initialProfile,
}) => {
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>(initialProfile?.name || 'Valen');
  const [gender, setGender] = useState<GenderType>(initialProfile?.gender || 'female');
  const [age, setAge] = useState<string>(initialProfile?.age ? String(initialProfile.age) : '26');
  const [weight, setWeight] = useState<string>(initialProfile?.weight_kg ? String(initialProfile.weight_kg) : '62');
  const [height, setHeight] = useState<string>(initialProfile?.height_cm ? String(initialProfile.height_cm) : '165');
  const [activity, setActivity] = useState<ActivityLevel>(initialProfile?.activity_level || 'moderate');

  // Dynamic Goal Category & Calorie Delta
  const initialCategory: GoalCategory = initialProfile?.goal_type?.startsWith('surplus')
    ? 'surplus'
    : initialProfile?.goal_type === 'maintenance'
    ? 'maintenance'
    : 'deficit';

  const [goalCategory, setGoalCategory] = useState<GoalCategory>(initialCategory);
  const [calorieDelta, setCalorieDelta] = useState<number>(300);
  const [saving, setSaving] = useState<boolean>(false);

  // Parse numbers
  const numAge = parseInt(age, 10) || 26;
  const numWeight = parseFloat(weight) || 62;
  const numHeight = parseFloat(height) || 165;

  const plan = NutritionCalculator.calculatePlanDynamic(
    gender,
    numWeight,
    numHeight,
    numAge,
    activity,
    goalCategory,
    calorieDelta
  );

  const handleNext = () => {
    if (step === 1 && (!name.trim() || !age.trim())) {
      Alert.alert('Datos requeridos', 'Por favor ingresa tu nombre y edad.');
      return;
    }
    if (step === 2 && (!weight.trim() || !height.trim())) {
      Alert.alert('Medidas requeridas', 'Por favor ingresa tu peso y altura.');
      return;
    }
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const saved = await UserProfileRepository.saveProfile({
        name: name.trim() || 'Usuario',
        gender,
        age: numAge,
        weight_kg: numWeight,
        height_cm: numHeight,
        activity_level: activity,
        goal_type: plan.goalType,
        bmr: plan.bmr,
        tdee: plan.tdee,
        target_calories: plan.targetCalories,
        is_active: 1,
      });

      onCompleted(saved);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo guardar el perfil: ' + err?.message);
    } finally {
      setSaving(false);
    }
  };

  const activityOptions: { key: ActivityLevel; title: string; desc: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
    { key: 'sedentary', title: 'Sedentario', desc: 'Poco movimiento, trabajo de oficina', icon: 'weekend' },
    { key: 'light', title: 'Ligero', desc: 'Caminatas o ejercicio 1-2 veces por semana', icon: 'directions-walk' },
    { key: 'moderate', title: 'Moderado', desc: 'Entrenamiento o deporte 3-5 días/semana', icon: 'fitness-center' },
    { key: 'active', title: 'Activo', desc: 'Entrenamiento intenso 6-7 días por semana', icon: 'bolt' },
  ];

  const getIntensityTheme = () => {
    if (goalCategory === 'maintenance') {
      return {
        title: 'Balance Neutro',
        rangeLabel: '0 kcal',
        icon: 'balance' as const,
        bg: '#F0F9FF',
        border: '#7DD3FC',
        badgeBg: '#E0F2FE',
        badgeText: '#0369A1',
        description: 'Consumir exactamente lo que tu cuerpo gasta. Mantiene tu peso corporal y vitalidad estables.',
      };
    }

    if (plan.intensity === 'sustainable') {
      return {
        title: 'Sostenible',
        rangeLabel: '100 - 300 kcal',
        icon: 'eco' as const,
        bg: '#F0FDF4',
        border: '#86EFAC',
        badgeBg: '#DCFCE7',
        badgeText: '#15803D',
        description:
          goalCategory === 'deficit'
            ? 'Pérdida de grasa constante y segura (~1.0 kg/mes). Cero fatiga ni hambre extrema; máxima adherencia a largo plazo.'
            : 'Ganancia muscular limpia minimizando la acumulación de tejido graso.',
      };
    }

    if (plan.intensity === 'moderate') {
      return {
        title: 'Moderado',
        rangeLabel: '350 - 500 kcal',
        icon: 'bolt' as const,
        bg: '#FFFBEB',
        border: '#FCD34D',
        badgeBg: '#FEF3C7',
        badgeText: '#B45309',
        description:
          goalCategory === 'deficit'
            ? 'Ritmo balanceado (~1.5 a 2.0 kg/mes). El estándar recomendado: equilibrio entre velocidad y bienestar.'
            : 'Aumento progresivo de fuerza y masa muscular magra continua.',
      };
    }

    return {
      title: 'Agresivo',
      rangeLabel: '> 500 kcal',
      icon: 'local-fire-department' as const,
      bg: '#FEF2F2',
      border: '#FCA5A5',
      badgeBg: '#FEE2E2',
      badgeText: '#B91C1C',
      description:
        goalCategory === 'deficit'
          ? 'Pérdida rápida de peso (~2.5+ kg/mes). Requiere mayor disciplina. Recomendado solo por períodos breves.'
          : 'Fase de volumen intensivo para aumento rápido de peso.',
    };
  };

  const intensityTheme = getIntensityTheme();

  const getStep4ButtonLabel = () => {
    if (goalCategory === 'maintenance') {
      return 'Continuar con Mantenimiento (0 kcal)';
    }
    const sign = goalCategory === 'deficit' ? '-' : '+';
    const catName = goalCategory === 'deficit' ? 'Déficit' : 'Superávit';
    const intName =
      plan.intensity === 'sustainable'
        ? 'Sostenible'
        : plan.intensity === 'moderate'
        ? 'Moderado'
        : 'Agresivo';

    return `Continuar con ${catName} ${intName} (${sign}${plan.deltaKcal} kcal)`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.modalContainer}>
        {/* Top Bar with progress indicators */}
        <View style={styles.topBar}>
          {step > 1 ? (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}

          <View style={styles.stepDots}>
            {[1, 2, 3, 4, 5].map((s) => (
              <View
                key={s}
                style={[
                  styles.dot,
                  s === step && styles.dotActive,
                  s < step && styles.dotCompleted,
                ]}
              />
            ))}
          </View>

          {onClose ? (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* STEP 1: Datos Básicos */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>PASO 1 DE 5</Text>
              </View>
              <Text style={styles.title}>¿Quién usará la app?</Text>
              <Text style={styles.subtitle}>
                Configuramos tu perfil para calcular tu gasto metabólico real.
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Tu Nombre</Text>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="ej. Valen"
                  placeholderTextColor={colors.outlineVariant}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Sexo Biológico (para la tasa metabólica)</Text>
                <View style={styles.genderRow}>
                  <TouchableOpacity
                    style={[styles.genderChip, gender === 'female' && styles.genderChipActive]}
                    onPress={() => setGender('female')}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name="female"
                      size={20}
                      color={gender === 'female' ? colors.onPrimary : colors.onSurfaceVariant}
                    />
                    <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
                      Mujer
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.genderChip, gender === 'male' && styles.genderChipActive]}
                    onPress={() => setGender('male')}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name="male"
                      size={20}
                      color={gender === 'male' ? colors.onPrimary : colors.onSurfaceVariant}
                    />
                    <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
                      Hombre
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Edad (años)</Text>
                <TextInput
                  style={styles.textInput}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  placeholder="ej. 26"
                  maxLength={3}
                />
              </View>
            </View>
          )}

          {/* STEP 2: Medidas Corporales */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>PASO 2 DE 5</Text>
              </View>
              <Text style={styles.title}>Tus medidas corporales</Text>
              <Text style={styles.subtitle}>
                Utilizamos la fórmula Mifflin-St Jeor para estimar tus calorías de reposo.
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Peso Actual (kg)</Text>
                <TextInput
                  style={styles.textInput}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  placeholder="ej. 62"
                  maxLength={5}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Altura (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                  placeholder="ej. 165"
                  maxLength={4}
                />
              </View>
            </View>
          )}

          {/* STEP 3: Actividad Física */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>PASO 3 DE 5</Text>
              </View>
              <Text style={styles.title}>Nivel de actividad física</Text>
              <Text style={styles.subtitle}>
                Determina cuántas calorías quemás a lo largo de un día normal.
              </Text>

              <View style={styles.optionsList}>
                {activityOptions.map((opt) => {
                  const isSelected = activity === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.optionCard, isSelected && styles.optionCardActive]}
                      onPress={() => setActivity(opt.key)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.optionIconBox, isSelected && styles.optionIconBoxActive]}>
                        <MaterialIcons
                          name={opt.icon}
                          size={24}
                          color={isSelected ? colors.onPrimary : colors.primary}
                        />
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={[styles.optionTitle, isSelected && styles.optionTitleActive]}>
                          {opt.title}
                        </Text>
                        <Text style={styles.optionDesc}>{opt.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 4: Objetivo Dinámico */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>PASO 4 DE 5</Text>
              </View>
              <Text style={styles.title}>¿Cuál es tu objetivo?</Text>
              <Text style={styles.subtitle}>
                Elegí la dirección calórica y ajustá el ritmo a tu medida.
              </Text>

              {/* Categorías Principales */}
              <View style={styles.categoryTabs}>
                <TouchableOpacity
                  style={[
                    styles.categoryTab,
                    goalCategory === 'deficit' && styles.categoryTabActive,
                  ]}
                  onPress={() => setGoalCategory('deficit')}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name="trending-down"
                    size={20}
                    color={goalCategory === 'deficit' ? colors.onPrimary : colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.categoryTabText,
                      goalCategory === 'deficit' && styles.categoryTabTextActive,
                    ]}
                  >
                    Déficit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.categoryTab,
                    goalCategory === 'maintenance' && styles.categoryTabActive,
                  ]}
                  onPress={() => setGoalCategory('maintenance')}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name="balance"
                    size={20}
                    color={goalCategory === 'maintenance' ? colors.onPrimary : colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.categoryTabText,
                      goalCategory === 'maintenance' && styles.categoryTabTextActive,
                    ]}
                  >
                    Mantener
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.categoryTab,
                    goalCategory === 'surplus' && styles.categoryTabActive,
                  ]}
                  onPress={() => setGoalCategory('surplus')}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name="trending-up"
                    size={20}
                    color={goalCategory === 'surplus' ? colors.onPrimary : colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.categoryTabText,
                      goalCategory === 'surplus' && styles.categoryTabTextActive,
                    ]}
                  >
                    Superávit
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Ajuste de Kcal (sólo si no es mantenimiento) */}
              {goalCategory !== 'maintenance' ? (
                <Card style={styles.adjustCard}>
                  <Text style={styles.adjustCardTitle}>Ajuste calórico diario</Text>

                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      style={[styles.stepperButton, calorieDelta <= 100 && styles.stepperButtonDisabled]}
                      onPress={() => setCalorieDelta((prev) => Math.max(100, prev - 50))}
                      disabled={calorieDelta <= 100}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="remove"
                        size={22}
                        color={calorieDelta <= 100 ? colors.outlineVariant : colors.onSurface}
                      />
                    </TouchableOpacity>

                    <View style={styles.stepperValueContainer}>
                      <Text style={styles.stepperValue}>
                        {goalCategory === 'deficit' ? '-' : '+'}
                        {calorieDelta}
                      </Text>
                      <Text style={styles.stepperUnit}>kcal / día</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.stepperButton, calorieDelta >= 1000 && styles.stepperButtonDisabled]}
                      onPress={() => setCalorieDelta((prev) => Math.min(1000, prev + 50))}
                      disabled={calorieDelta >= 1000}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="add"
                        size={22}
                        color={calorieDelta >= 1000 ? colors.outlineVariant : colors.onSurface}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Preset chips */}
                  <View style={styles.presetChipsRow}>
                    {[200, 300, 450, 600].map((preset) => {
                      const isSelectedPreset = calorieDelta === preset;
                      return (
                        <TouchableOpacity
                          key={preset}
                          style={[styles.presetChip, isSelectedPreset && styles.presetChipActive]}
                          onPress={() => setCalorieDelta(preset)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              isSelectedPreset && styles.presetChipTextActive,
                            ]}
                          >
                            {goalCategory === 'deficit' ? `-${preset}` : `+${preset}`} kcal
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Card>
              ) : null}

              {/* Dynamic Intensity Feedback Card */}
              <View
                style={[
                  styles.intensityCard,
                  { backgroundColor: intensityTheme.bg, borderColor: intensityTheme.border },
                ]}
              >
                <View style={styles.intensityHeader}>
                  <View style={[styles.intensityBadge, { backgroundColor: intensityTheme.badgeBg }]}>
                    <MaterialIcons
                      name={intensityTheme.icon}
                      size={16}
                      color={intensityTheme.badgeText}
                    />
                    <Text style={[styles.intensityBadgeText, { color: intensityTheme.badgeText }]}>
                      {intensityTheme.title}
                    </Text>
                  </View>

                  <Text style={[styles.intensityRangeText, { color: intensityTheme.badgeText }]}>
                    {intensityTheme.rangeLabel}
                  </Text>
                </View>

                <Text style={styles.intensityDescription}>{intensityTheme.description}</Text>

                <View style={styles.intensityPreviewDivider} />

                <View style={styles.intensityPreviewRow}>
                  <Text style={styles.intensityPreviewKey}>
                    Gasto Diario (TDEE): {plan.tdee.toLocaleString()} kcal
                  </Text>
                  <Text style={styles.intensityPreviewTarget}>
                    Meta:{' '}
                    <Text style={{ fontWeight: '800', color: intensityTheme.badgeText }}>
                      {plan.targetCalories.toLocaleString()} kcal
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* STEP 5: Resultado / Confirmación */}
          {step === 5 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>PLAN PERSONALIZADO</Text>
              </View>
              <Text style={styles.title}>¡Todo listo, {name}!</Text>
              <Text style={styles.subtitle}>
                Este es el cálculo nutricional exacto para alcanzar tu objetivo de forma sostenible.
              </Text>

              {/* Highlight Target Card */}
              <Card style={styles.resultCard}>
                <Text style={styles.resultLabel}>TU META DIARIA RECOMENDADA</Text>
                <View style={styles.targetNumberRow}>
                  <Text style={styles.targetNumber}>{plan.targetCalories.toLocaleString()}</Text>
                  <Text style={styles.targetUnit}>kcal / día</Text>
                </View>

                <View style={styles.goalDescriptionPill}>
                  <MaterialIcons name="check-circle" size={16} color={colors.secondary} />
                  <Text style={styles.goalDescriptionText}>{plan.description}</Text>
                </View>

                {/* Metabolic Breakdown */}
                <View style={styles.breakdownBox}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownKey}>Tasa Metabólica Basal (en reposo)</Text>
                    <Text style={styles.breakdownVal}>{plan.bmr.toLocaleString()} kcal</Text>
                  </View>
                  <View style={styles.breakdownDivider} />
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownKey}>Gasto Total Diario (con actividad)</Text>
                    <Text style={styles.breakdownVal}>{plan.tdee.toLocaleString()} kcal</Text>
                  </View>
                </View>
              </Card>

              <Text style={styles.bottomNote}>
                Podés recalcular o ajustar esta meta en cualquier momento desde tu perfil.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          {step < 4 ? (
            <Button label="Continuar" icon="arrow-forward" onPress={handleNext} />
          ) : step === 4 ? (
            <Button
              label={getStep4ButtonLabel()}
              icon="arrow-forward"
              onPress={handleNext}
            />
          ) : (
            <Button
              label={`Comenzar con ${plan.targetCalories.toLocaleString()} kcal`}
              icon="rocket-launch"
              onPress={handleFinish}
              loading={saving}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHighest,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.primary,
  },
  dotCompleted: {
    backgroundColor: colors.secondary,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 100,
    maxWidth: 480,
    marginHorizontal: 'auto',
    width: '100%',
  },
  stepContainer: {
    gap: spacing.md,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: spacing.radius.pill,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onPrimaryFixedVariant,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  formGroup: {
    gap: 6,
    marginTop: spacing.xs,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  textInput: {
    height: 52,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  genderChip: {
    flex: 1,
    height: 50,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  genderChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
  genderTextActive: {
    color: colors.onPrimary,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerLow,
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconBoxActive: {
    backgroundColor: colors.primary,
  },
  optionInfo: {
    flex: 1,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  optionTitleActive: {
    color: colors.primary,
  },
  optionDesc: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 17,
  },
  recTag: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: spacing.radius.pill,
  },
  recTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSecondaryContainer,
  },
  resultCard: {
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  targetNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  targetNumber: {
    fontSize: 54,
    fontWeight: '800',
    color: colors.primary,
  },
  targetUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  goalDescriptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: spacing.radius.pill,
  },
  goalDescriptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSecondaryContainer,
  },
  breakdownBox: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownKey: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHighest,
    marginVertical: 8,
  },
  bottomNote: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  categoryTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  categoryTab: {
    flex: 1,
    height: 48,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  categoryTabTextActive: {
    color: colors.onPrimary,
  },
  adjustCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  adjustCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginVertical: 4,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  stepperButtonDisabled: {
    opacity: 0.35,
  },
  stepperValueContainer: {
    alignItems: 'center',
    minWidth: 130,
  },
  stepperValue: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  stepperUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  presetChipsRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: spacing.radius.pill,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  presetChipActive: {
    backgroundColor: colors.primaryFixed,
    borderColor: colors.primary,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  presetChipTextActive: {
    color: colors.onPrimaryFixedVariant,
  },
  intensityCard: {
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    gap: 6,
    marginTop: spacing.xs,
  },
  intensityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  intensityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: spacing.radius.pill,
  },
  intensityBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  intensityRangeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  intensityDescription: {
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 18,
    marginTop: 4,
  },
  intensityPreviewDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 4,
  },
  intensityPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  intensityPreviewKey: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  intensityPreviewTarget: {
    fontSize: 12,
    color: colors.onSurface,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
    maxWidth: 480,
    marginHorizontal: 'auto',
    width: '100%',
  },
});
