import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/frontend/theme';
import {
  NutritionEstimator,
  EstimatedFoodItem,
  EstimationResult,
} from '@/backend/ai/nutritionEstimator';

interface AIEstimatorModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmBatch: (items: Array<{ title: string; calories: number; quantity?: string }>) => Promise<void>;
}

const QUICK_SUGGESTIONS = [
  'Milanesa de pollo con puré y ensalada',
  '2 empanadas de carne al horno',
  'Fideos con tuco, carne picada y queso',
  'Café con leche y 2 tostadas con queso y mermelada',
  'Porción de tarta de jamón y queso con ensalada',
];

export const AIEstimatorModal: React.FC<AIEstimatorModalProps> = ({
  visible,
  onClose,
  onConfirmBatch,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [items, setItems] = useState<EstimatedFoodItem[]>([]);

  useEffect(() => {
    if (!visible) {
      // Reset state on modal close
      setInputText('');
      setResult(null);
      setItems([]);
      setLoading(false);
      setSaving(false);
    }
  }, [visible]);

  const handleEstimate = async (textToAnalyze?: string) => {
    const text = (textToAnalyze || inputText).trim();
    if (!text) {
      Alert.alert('Escribí o dictá tu comida', 'Por favor ingresá qué comiste para poder estimarlo.');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    try {
      const res = await NutritionEstimator.estimateMeal(text);
      if (!res.items || res.items.length === 0) {
        Alert.alert(
          'Sin resultados',
          'No pudimos identificar ingredientes específicos. Probá detallando un poco más (ej. "Milanesa de carne con ensalada mixta").'
        );
      } else {
        setResult(res);
        setItems(res.items);
      }
    } catch (err: any) {
      Alert.alert('Error en la estimación', err?.message || 'Ocurrió un problema al procesar los alimentos.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalCalories = items.reduce((acc, item) => acc + item.calories, 0);

  const handleConfirm = async () => {
    if (items.length === 0) {
      Alert.alert('No hay ítems', 'No hay ningún alimento en la lista para agregar.');
      return;
    }

    setSaving(true);
    try {
      await onConfirmBatch(items);
      // Autonomous background learning to vector knowledge base
      NutritionEstimator.learnMealMemory(inputText, items, totalCalories);
      onClose();
    } catch (err: any) {
      Alert.alert('Error al guardar', 'No se pudieron guardar los alimentos: ' + err?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Sibling Backdrop: Tapping outside dismisses keyboard and closes modal */}
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />

        {/* Sheet Container: DIRECT view without gesture-intercepting touchable wrappers */}
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.sparkleIcon}>
                <MaterialIcons name="auto-awesome" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Estimación Inteligente</Text>
                <Text style={styles.headerSubtitle}>
                  Porciones reales y auditoría de aceites
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.iconButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Native ScrollView with full gesture responder access */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            {/* Step 1: Input & Suggestions */}
            {!result ? (
              <>
                <Text style={styles.helperText}>
                  Escribí o dictale con el micrófono de tu teclado tal como hablás. La IA desarmará tu plato en porciones reales y sumará las calorías invisibles de cocción.
                </Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.mainInput}
                    placeholder="ej. Milanesa con puré y ensalada de tomate y lechuga"
                    placeholderTextColor={colors.outlineVariant}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline={true}
                    numberOfLines={3}
                    returnKeyType="done"
                  />

                  {inputText.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearInputBtn}
                      onPress={() => setInputText('')}
                    >
                      <MaterialIcons name="cancel" size={18} color={colors.outline} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Quick Suggestions Chips */}
                <Text style={styles.chipsSectionTitle}>Ejemplos rápidos para probar:</Text>
                <View style={styles.chipsContainer}>
                  {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.chip}
                      onPress={() => {
                        setInputText(suggestion);
                        handleEstimate(suggestion);
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="touch-app" size={14} color={colors.primary} />
                      <Text style={styles.chipText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Estimate Button */}
                <TouchableOpacity
                  style={[
                    styles.estimateBtn,
                    (!inputText.trim() || loading) && styles.estimateBtnDisabled,
                  ]}
                  onPress={() => handleEstimate()}
                  disabled={!inputText.trim() || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                      <Text style={styles.estimateBtnText}>
                        Analizando alimentos y porciones...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.loadingRow}>
                      <MaterialIcons name="auto-awesome" size={20} color={colors.onPrimary} />
                      <Text style={styles.estimateBtnText}>Calcular Calorías</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              /* Step 2: Results and Confirmation */
              <>
                {/* Clean Status & Reset Bar */}
                <View style={styles.resultHeaderBar}>
                  <View style={styles.sourceBadge}>
                    <MaterialIcons
                      name={result.userHabitApplied ? 'auto-stories' : 'auto-awesome'}
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={styles.sourceBadgeText}>
                      {result.userHabitApplied ? 'Hábito Personalizado' : 'Estimación Calibrada'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => {
                      setResult(null);
                      setItems([]);
                    }}
                  >
                    <MaterialIcons name="edit" size={14} color={colors.primary} />
                    <Text style={styles.retryBtnText}>Modificar plato</Text>
                  </TouchableOpacity>
                </View>

                {/* User Habit / Semantic Memory Callout */}
                {result.userHabitApplied ? (
                  <View style={styles.habitCallout}>
                    <View style={styles.habitCalloutHeader}>
                      <MaterialIcons name="psychology" size={16} color={colors.primary} />
                      <Text style={styles.habitCalloutTitle}>Hábito Personalizado</Text>
                    </View>
                    <Text style={styles.habitCalloutDesc}>{result.userHabitApplied}</Text>
                  </View>
                ) : null}

                {/* Hidden Cooking Fats / Anti-Underreporting Card */}
                {result.cookingFatsAudit ? (
                  <View style={styles.auditCallout}>
                    <View style={styles.auditCalloutHeader}>
                      <MaterialIcons name="verified-user" size={16} color={colors.secondary} />
                      <Text style={styles.auditCalloutTitle}>
                        Auditoría de Grasas y Cocción
                      </Text>
                    </View>
                    <Text style={styles.auditCalloutDesc}>{result.cookingFatsAudit}</Text>
                  </View>
                ) : null}

                {/* Items List */}
                <Text style={styles.itemsListTitle}>Alimentos identificados ({items.length}):</Text>

                <View style={styles.itemsCard}>
                  {items.map((item, idx) => (
                    <View key={idx}>
                      <View style={styles.itemRow}>
                        <View style={styles.itemMainInfo}>
                          <Text style={styles.itemTitle}>{item.title}</Text>
                          <View style={styles.itemMetaRow}>
                            <View style={styles.grammageBadge}>
                              <MaterialIcons name="scale" size={12} color={colors.primary} />
                              <Text style={styles.grammageBadgeText}>{item.quantity}</Text>
                            </View>
                            <Text style={styles.itemCaloriesBadge}>
                              {item.calories} kcal
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={styles.removeItemBtn}
                          onPress={() => handleRemoveItem(idx)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialIcons name="close" size={18} color={colors.outline} />
                        </TouchableOpacity>
                      </View>
                      {idx < items.length - 1 && <View style={styles.itemDivider} />}
                    </View>
                  ))}
                </View>

                {/* Total Calories Summary Box */}
                <View style={styles.summaryTotalBox}>
                  <View>
                    <Text style={styles.summaryTotalLabel}>Total estimado calibrado:</Text>
                    <Text style={styles.summaryTotalSub}>
                      Sin sesgos de infraestimación
                    </Text>
                  </View>
                  <Text style={styles.summaryTotalNumber}>
                    {totalCalories.toLocaleString()} <Text style={styles.summaryKcalUnit}>kcal</Text>
                  </Text>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={[
                    styles.confirmBatchBtn,
                    (items.length === 0 || saving) && styles.estimateBtnDisabled,
                  ]}
                  onPress={handleConfirm}
                  disabled={items.length === 0 || saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <>
                      <MaterialIcons name="check-circle" size={20} color={colors.onPrimary} />
                      <Text style={styles.confirmBatchBtnText}>
                        Guardar todas las comidas ({totalCalories} kcal)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(25, 28, 25, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sparkleIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    maxHeight: 520,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  helperText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  mainInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: colors.primaryFixedDim,
    borderRadius: 16,
    padding: 14,
    paddingTop: 14,
    paddingRight: 36,
    fontSize: 15,
    color: colors.onSurface,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  clearInputBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  chipsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  chipText: {
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
  },
  estimateBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  estimateBtnDisabled: {
    opacity: 0.55,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  estimateBtnText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  resultHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.primaryFixed,
  },
  sourceBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  habitCallout: {
    backgroundColor: colors.primaryFixed,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  habitCalloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  habitCalloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onPrimaryFixed,
  },
  habitCalloutDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.onPrimaryFixedVariant,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  retryBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.primary,
  },
  auditCallout: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  auditCalloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  auditCalloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSecondaryContainer,
  },
  auditCalloutDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.onSecondaryContainer,
  },
  itemsListTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  itemsCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  itemMainInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 4,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  grammageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  grammageBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  itemCaloriesBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.tertiary,
  },
  removeItemBtn: {
    padding: 4,
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
  },
  summaryTotalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  summaryTotalSub: {
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  summaryTotalNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  summaryKcalUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  confirmBatchBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 15,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBatchBtnText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
