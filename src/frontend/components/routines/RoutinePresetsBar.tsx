import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/frontend/theme';
import { DailyMealTemplate, MealSlot } from '@/types';
import { MealTemplateRepository } from '@/data/repositories';
import { RoutineQuickLogModal } from './RoutineQuickLogModal';

interface RoutinePresetsBarProps {
  onLogMeal: (
    items: Array<{ title: string; quantity: string; calories: number }>,
    totalCalories: number,
    slot: MealSlot
  ) => Promise<void>;
  compact?: boolean;
}

const SLOT_ICONS: Record<MealSlot, keyof typeof MaterialIcons.glyphMap> = {
  desayuno: 'wb-sunny',
  almuerzo: 'restaurant',
  merienda: 'coffee',
  cena: 'nights-stay',
};

const DEFAULT_TEMPLATES: DailyMealTemplate[] = [
  {
    id: 1,
    meal_slot: 'desayuno',
    title: 'Desayuno Habitual',
    items_json: JSON.stringify([
      { title: 'Café con leche descremada', quantity: '1 taza (200ml)', calories: 95 },
      { title: 'Tostadas integrales con queso untable light', quantity: '2 unidades', calories: 145 },
    ]),
    total_calories: 240,
    is_active: 1,
    created_at: '',
    updated_at: '',
  },
  {
    id: 2,
    meal_slot: 'almuerzo',
    title: 'Almuerzo Habitual',
    items_json: JSON.stringify([
      { title: 'Pechuga grillada', quantity: '150g', calories: 220 },
      { title: 'Ensalada mixta fresca', quantity: '1 plato', calories: 60 },
      { title: 'Huevo duro', quantity: '1 un.', calories: 75 },
      { title: 'Rocío vegetal', quantity: '1 porción', calories: 15 },
    ]),
    total_calories: 370,
    is_active: 1,
    created_at: '',
    updated_at: '',
  },
  {
    id: 3,
    meal_slot: 'merienda',
    title: 'Merienda Habitual',
    items_json: JSON.stringify([
      { title: 'Infusión con leche descremada', quantity: '1 taza', calories: 80 },
      { title: 'Tostada integral con queso untable light', quantity: '1 un.', calories: 120 },
    ]),
    total_calories: 200,
    is_active: 1,
    created_at: '',
    updated_at: '',
  },
  {
    id: 4,
    meal_slot: 'cena',
    title: 'Cena Habitual',
    items_json: JSON.stringify([
      { title: 'Milanesa al horno', quantity: '1 un. (140g)', calories: 250 },
      { title: 'Puré de calabaza casero', quantity: '180g', calories: 120 },
      { title: 'Ensalada verde', quantity: '1 porción', calories: 40 },
    ]),
    total_calories: 410,
    is_active: 1,
    created_at: '',
    updated_at: '',
  },
];

export const RoutinePresetsBar: React.FC<RoutinePresetsBarProps> = ({
  onLogMeal,
  compact = false,
}) => {
  const [templates, setTemplates] = useState<DailyMealTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<DailyMealTemplate | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const list = await MealTemplateRepository.getAllTemplates();
      if (list && list.length > 0) {
        setTemplates(list);
      }
    } catch (e) {
      console.warn('Could not load routine templates, using defaults:', e);
    }
  };

  const handleOpenPreset = (t: DailyMealTemplate) => {
    setSelectedTemplate(t);
    setModalVisible(true);
  };

  const handleConfirmLog = async (
    items: Array<{ title: string; quantity: string; calories: number }>,
    totalCalories: number,
    slot: MealSlot
  ) => {
    await onLogMeal(items, totalCalories, slot);
    await loadTemplates(); // Reload in case template was updated
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <MaterialIcons name="bolt" size={16} color={colors.primary} />
          <Text style={styles.title}>Carga Rápida en 2 Taps</Text>
        </View>
        <Text style={styles.subtitle}>Tus rutinas habituales</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {templates.map((tmpl) => {
          const icon = SLOT_ICONS[tmpl.meal_slot] || 'restaurant';
          return (
            <TouchableOpacity
              key={tmpl.meal_slot}
              style={styles.presetChip}
              onPress={() => handleOpenPreset(tmpl)}
              activeOpacity={0.7}
            >
              <View style={styles.chipTop}>
                <MaterialIcons name={icon} size={15} color={colors.primary} />
                <Text style={styles.chipSlot}>{tmpl.meal_slot}</Text>
              </View>
              <Text style={styles.chipCalories}>{tmpl.total_calories} kcal</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 2-Tap Modal */}
      <RoutineQuickLogModal
        visible={modalVisible}
        template={selectedTemplate}
        onClose={() => setModalVisible(false)}
        onConfirmLog={handleConfirmLog}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  containerCompact: {
    padding: 10,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.onSurface,
  },
  subtitle: {
    fontSize: 11,
    color: colors.outline,
    fontWeight: '600',
  },
  scrollList: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  presetChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(102, 85, 118, 0.12)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 96,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  chipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  chipSlot: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  chipCalories: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.onSurface,
  },
});
