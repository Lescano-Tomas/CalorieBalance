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
import { GenderType, ActivityLevel, GoalType, UserProfile } from '@/types';

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
  const [goal, setGoal] = useState<GoalType>(initialProfile?.goal_type || 'deficit_moderate');
  const [saving, setSaving] = useState<boolean>(false);

  // Parse numbers
  const numAge = parseInt(age, 10) || 26;
  const numWeight = parseFloat(weight) || 62;
  const numHeight = parseFloat(height) || 165;

  const plan = NutritionCalculator.calculatePlan(
    gender,
    numWeight,
    numHeight,
    numAge,
    activity,
    goal
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
        goal_type: goal,
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

  const goalOptions: { key: GoalType; title: string; desc: string; tag: string; isRecommended?: boolean }[] = [
    {
      key: 'deficit_moderate',
      title: 'Déficit Sostenible (-300 kcal)',
      desc: 'Quema grasa constante (~1.2 kg al mes) sin pasar hambre ni efecto rebote.',
      tag: 'Recomendado',
      isRecommended: true,
    },
    {
      key: 'deficit_aggressive',
      title: 'Déficit Marcado (-500 kcal)',
      desc: 'Pérdida acelerada de peso (~2 kg al mes). Requiere mayor disciplina.',
      tag: 'Acelerado',
    },
    {
      key: 'maintenance',
      title: 'Mantenimiento (0 kcal)',
      desc: 'Consumir exactamente lo que gastas para mantener peso y energía.',
      tag: 'Equilibrio',
    },
    {
      key: 'surplus_moderate',
      title: 'Superávit Controlado (+300 kcal)',
      desc: 'Aumento gradual de masa muscular magra acompañado de fuerza.',
      tag: 'Masa Muscular',
    },
  ];

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

          {/* STEP 4: Objetivo */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>PASO 4 DE 5</Text>
              </View>
              <Text style={styles.title}>¿Cuál es tu objetivo?</Text>
              <Text style={styles.subtitle}>
                Elegí la intensidad con la que querés encarar tu proceso.
              </Text>

              <View style={styles.optionsList}>
                {goalOptions.map((opt) => {
                  const isSelected = goal === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.optionCard, isSelected && styles.optionCardActive]}
                      onPress={() => setGoal(opt.key)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.optionInfo}>
                        <View style={styles.optionHeaderRow}>
                          <Text style={[styles.optionTitle, isSelected && styles.optionTitleActive]}>
                            {opt.title}
                          </Text>
                          {opt.isRecommended && (
                            <View style={styles.recTag}>
                              <Text style={styles.recTagText}>Recomendado</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.optionDesc}>{opt.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
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
          {step < 5 ? (
            <Button label="Continuar" icon="arrow-forward" onPress={handleNext} />
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
