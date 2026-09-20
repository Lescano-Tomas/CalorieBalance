import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/frontend/theme';
import { DailyMealTemplate, MealSlot } from '@/types';
import { MealTemplateRepository } from '@/data/repositories';

interface RoutineQuickLogModalProps {
  visible: boolean;
  template: DailyMealTemplate | null;
  onClose: () => void;
  onConfirmLog: (
    items: Array<{ title: string; quantity: string; calories: number }>,
    totalCalories: number,
    slot: MealSlot
  ) => Promise<void>;
}

const SLOT_ICONS: Record<MealSlot, keyof typeof MaterialIcons.glyphMap> = {
  desayuno: 'wb-sunny',
  almuerzo: 'restaurant',
  merienda: 'coffee',
  cena: 'nights-stay',
};

export const RoutineQuickLogModal: React.FC<RoutineQuickLogModalProps> = ({
  visible,
  template,
  onClose,
  onConfirmLog,
}) => {
  const [items, setItems] = useState<Array<{ title: string; quantity: string; calories: number }>>([]);
  const [totalCalories, setTotalCalories] = useState<number>(0);
  const [showVariationEditor, setShowVariationEditor] = useState<boolean>(false);
  const [variationNote, setVariationNote] = useState<string>('');
  const [calorieDelta, setCalorieDelta] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(false);

  useEffect(() => {
    if (template) {
      try {
        const parsed = JSON.parse(template.items_json);
        setItems(parsed);
        setTotalCalories(template.total_calories);
      } catch {
        setItems([{ title: template.title, quantity: '1 porción', calories: template.total_calories }]);
        setTotalCalories(template.total_calories);
      }
      setShowVariationEditor(false);
      setCalorieDelta(0);
      setVariationNote('');
      setSaveAsDefault(false);
    }
  }, [template, visible]);

  if (!template) return null;

  const currentSlot = template.meal_slot;
  const slotIcon = SLOT_ICONS[currentSlot] || 'restaurant';
  const effectiveCalories = Math.max(0, totalCalories + calorieDelta);

  const handleAdjustCalories = (delta: number) => {
    setCalorieDelta((prev) => prev + delta);
  };

  const handleFastConfirm = async () => {
    setSubmitting(true);
    try {
      let finalItems = [...items];

      if (calorieDelta !== 0 || variationNote.trim()) {
        finalItems.push({
          title: variationNote.trim() ? `Variante: ${variationNote.trim()}` : 'Ajuste de variante',
          quantity: '1 porción',
          calories: calorieDelta,
        });
      }

      // If user chose to save as new default template
      if (saveAsDefault && (calorieDelta !== 0 || variationNote.trim())) {
        try {
          await MealTemplateRepository.saveOrUpdateTemplate(
            currentSlot,
            template.title,
            finalItems.filter((it) => it.calories > 0),
            effectiveCalories
          );
        } catch (e) {
          console.warn('Could not update default template:', e);
        }
      }

      await onConfirmLog(finalItems, effectiveCalories, currentSlot);
      onClose();
    } catch (err: any) {
      Alert.alert('Error al registrar', err?.message || 'No se pudo registrar la comida.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.slotIconCircle}>
                <MaterialIcons name={slotIcon} size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>{template.title}</Text>
                <Text style={styles.headerSubtitle}>
                  {currentSlot.toUpperCase()} • Carga Rápida
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <MaterialIcons name="close" size={22} color={colors.outline} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Ingredients Breakdown */}
            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownHeader}>COMPOSICIÓN HABITUAL:</Text>
              {items.map((it, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={styles.itemBullet} />
                  <View style={styles.itemTextCol}>
                    <Text style={styles.itemTitle}>{it.title}</Text>
                    {!!it.quantity && <Text style={styles.itemQty}>{it.quantity}</Text>}
                  </View>
                  <Text style={styles.itemCals}>{it.calories} kcal</Text>
                </View>
              ))}
            </View>

            {/* Variation Section Toggle */}
            {!showVariationEditor ? (
              <TouchableOpacity
                style={styles.toggleVariationBtn}
                onPress={() => setShowVariationEditor(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="tune" size={16} color={colors.primary} />
                <Text style={styles.toggleVariationText}>¿Comiste algo distinto hoy? Ajustar variante</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.variationPanel}>
                <View style={styles.variationHeaderRow}>
                  <Text style={styles.variationPanelTitle}>Ajustar variante de hoy</Text>
                  <TouchableOpacity onPress={() => setShowVariationEditor(false)}>
                    <Text style={styles.closeVariationText}>Ocultar</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick Nudges */}
                <View style={styles.nudgeRow}>
                  <TouchableOpacity
                    style={styles.nudgeChip}
                    onPress={() => handleAdjustCalories(-100)}
                  >
                    <Text style={styles.nudgeChipText}>-100 kcal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.nudgeChip}
                    onPress={() => handleAdjustCalories(-50)}
                  >
                    <Text style={styles.nudgeChipText}>-50 kcal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.nudgeChip, styles.nudgePositive]}
                    onPress={() => handleAdjustCalories(50)}
                  >
                    <Text style={[styles.nudgeChipText, styles.nudgePositiveText]}>+50 kcal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.nudgeChip, styles.nudgePositive]}
                    onPress={() => handleAdjustCalories(100)}
                  >
                    <Text style={[styles.nudgeChipText, styles.nudgePositiveText]}>+100 kcal</Text>
                  </TouchableOpacity>
                </View>

                {/* Optional description of what changed */}
                <TextInput
                  style={styles.variationInput}
                  placeholder="Detalle de variante (ej: comí 3 tostadas, sumé 1 huevo)"
                  placeholderTextColor={colors.outlineVariant}
                  value={variationNote}
                  onChangeText={setVariationNote}
                />

                {/* Checkbox / Toggle Save as Default */}
                <TouchableOpacity
                  style={styles.saveDefaultToggle}
                  onPress={() => setSaveAsDefault(!saveAsDefault)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={saveAsDefault ? 'check-box' : 'check-box-outline-blank'}
                    size={18}
                    color={saveAsDefault ? colors.primary : colors.outline}
                  />
                  <Text style={styles.saveDefaultText}>
                    Guardar esta variante como mi nuevo preset habitual
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer Action (TAP 2) */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.fastLogBtn}
              onPress={handleFastConfirm}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <MaterialIcons name="bolt" size={20} color="#ffffff" />
                  <Text style={styles.fastLogBtnText}>
                    Cargar {template.title} ({effectiveCalories} kcal)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: spacing.lg,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(102, 85, 118, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slotIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  scrollBody: {
    maxHeight: 320,
  },
  breakdownBox: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  breakdownHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  itemTextCol: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  itemQty: {
    fontSize: 11,
    color: colors.outline,
  },
  itemCals: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  toggleVariationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primaryFixed,
    marginBottom: 6,
  },
  toggleVariationText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  variationPanel: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  variationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  variationPanelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  closeVariationText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  nudgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  nudgeChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  nudgePositive: {
    backgroundColor: colors.secondaryFixed,
  },
  nudgePositiveText: {
    color: colors.secondary,
  },
  variationInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: colors.onSurface,
    marginBottom: 10,
  },
  saveDefaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveDefaultText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(102, 85, 118, 0.08)',
  },
  fastLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fastLogBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
