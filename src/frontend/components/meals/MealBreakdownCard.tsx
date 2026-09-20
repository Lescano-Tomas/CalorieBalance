import React, { useState } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/frontend/theme';
import { Card } from '@/frontend/components/ui';
import { MealEntry } from '@/types';

interface MealBreakdownCardProps {
  meals: MealEntry[];
  loading?: boolean;
  onAddMeal: (title: string, calories: number, quantity?: string) => Promise<void>;
  onDeleteMeal: (id: number) => Promise<void>;
}

export const MealBreakdownCard: React.FC<MealBreakdownCardProps> = ({
  meals,
  loading = false,
  onAddMeal,
  onDeleteMeal,
}) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [caloriesStr, setCaloriesStr] = useState<string>('');
  const [adding, setAdding] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const totalMealCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);

  const handleAddSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Falta el nombre', 'Por favor ingresa qué comida o ingrediente vas a registrar.');
      return;
    }

    const cals = parseInt(caloriesStr, 10);
    if (isNaN(cals) || cals <= 0) {
      Alert.alert('Calorías inválidas', 'Por favor ingresa un valor de calorías mayor a cero.');
      return;
    }

    setAdding(true);
    Keyboard.dismiss();
    try {
      await onAddMeal(title.trim(), cals, quantity.trim() || undefined);
      setTitle('');
      setQuantity('');
      setCaloriesStr('');
      setShowAddModal(false);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo agregar la comida: ' + err?.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number, itemTitle: string) => {
    setDeletingId(id);
    try {
      await onDeleteMeal(id);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo eliminar: ' + err?.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card style={styles.cardContainer}>
      {/* Accordion Toggle Header */}
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBox}>
            <MaterialIcons name="restaurant-menu" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Desglose de Comidas</Text>
            <Text style={styles.headerSubtitle}>
              {meals.length} {meals.length === 1 ? 'ítem' : 'ítems'} cargados • {totalMealCalories.toLocaleString()} kcal
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <MaterialIcons
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={24}
            color={colors.onSurfaceVariant}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {expanded && (
        <View style={styles.body}>
          {loading ? (
            <View style={styles.innerLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <>
              {/* List of Meals */}
              {meals.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="receipt-long" size={28} color={colors.outlineVariant} />
                  <Text style={styles.emptyTitle}>Sin comidas individuales aún</Text>
                  <Text style={styles.emptySubtitle}>
                    Podés cargar ingredientes y porciones abajo para tener el desglose exacto.
                  </Text>
                </View>
              ) : (
                <View style={styles.mealList}>
                  {meals.map((meal, index) => {
                    const isDeleting = deletingId === meal.id;
                    return (
                      <View key={meal.id}>
                        <View style={styles.mealRow}>
                          <View style={styles.mealInfo}>
                            <Text style={styles.mealTitle} numberOfLines={1}>
                              {meal.title}
                            </Text>
                            <View style={styles.mealMetaRow}>
                              <Text style={styles.mealCalories}>
                                {meal.calories.toLocaleString()} kcal
                              </Text>
                              {meal.quantity ? (
                                <>
                                  <Text style={styles.metaBullet}>•</Text>
                                  <View style={styles.quantityBadge}>
                                    <Text style={styles.quantityBadgeText}>
                                      {meal.quantity}
                                    </Text>
                                  </View>
                                </>
                              ) : null}
                            </View>
                          </View>

                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDelete(meal.id, meal.title)}
                            disabled={isDeleting}
                            activeOpacity={0.6}
                          >
                            {isDeleting ? (
                              <ActivityIndicator size="small" color={colors.error} />
                            ) : (
                              <MaterialIcons
                                name="delete-outline"
                                size={20}
                                color={colors.onSurfaceVariant}
                              />
                            )}
                          </TouchableOpacity>
                        </View>
                        {index < meals.length - 1 && <View style={styles.mealDivider} />}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Add Meal Trigger Button */}
              <TouchableOpacity
                style={styles.addTriggerButton}
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.addTriggerText}>Agregar comida / ingrediente</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Modal for Adding New Meal */}
      <Modal
        visible={showAddModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          Keyboard.dismiss();
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBackdropTouch}>
              <TouchableWithoutFeedback>
                <View style={styles.modalCard}>
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderTitleRow}>
                      <View style={styles.modalIconBox}>
                        <MaterialIcons name="restaurant" size={18} color={colors.primary} />
                      </View>
                      <Text style={styles.modalTitle}>Agregar Comida</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setShowAddModal(false);
                        Keyboard.dismiss();
                      }}
                      style={styles.modalCloseBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalSubtitle}>
                    Indicá el nombre, porción o gramaje y las calorías estimadas.
                  </Text>

                  {/* Input: Nombre */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nombre del alimento</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="ej. Pechuga de pollo grillada"
                      placeholderTextColor={colors.outlineVariant}
                      value={title}
                      onChangeText={setTitle}
                      returnKeyType="next"
                    />
                  </View>

                  {/* Row: Cantidad & Calorías */}
                  <View style={styles.formRow}>
                    <View style={[styles.inputGroup, { flex: 1.2 }]}>
                      <Text style={styles.inputLabel}>Cantidad / Gramaje</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        placeholder="ej. 150g / 1 taza"
                        placeholderTextColor={colors.outlineVariant}
                        value={quantity}
                        onChangeText={setQuantity}
                        returnKeyType="next"
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Calorías (kcal)</Text>
                      <TextInput
                        style={styles.modalTextInput}
                        placeholder="ej. 240"
                        placeholderTextColor={colors.outlineVariant}
                        value={caloriesStr}
                        onChangeText={setCaloriesStr}
                        keyboardType="numeric"
                        returnKeyType="done"
                        onSubmitEditing={handleAddSubmit}
                      />
                    </View>
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.modalSubmitButton, adding && styles.submitButtonDisabled]}
                    onPress={handleAddSubmit}
                    disabled={adding}
                    activeOpacity={0.8}
                  >
                    {adding ? (
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                      <>
                        <MaterialIcons name="check" size={20} color={colors.onPrimary} />
                        <Text style={styles.modalSubmitButtonText}>Agregar al Día</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </Card>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    padding: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.lg,
    overflow: 'hidden',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRight: {
    paddingLeft: spacing.sm,
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHighest,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  innerLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  mealList: {
    marginBottom: spacing.sm,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  mealInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  mealTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 3,
  },
  mealMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealCalories: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  metaBullet: {
    fontSize: 11,
    color: colors.outlineVariant,
  },
  quantityBadge: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: spacing.radius.pill,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  quantityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHighest,
  },
  addTriggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    marginTop: spacing.xs,
  },
  addTriggerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdropTouch: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modalIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
    marginTop: -4,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  modalTextInput: {
    height: 48,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.onSurface,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalSubmitButton: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: spacing.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  modalSubmitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
