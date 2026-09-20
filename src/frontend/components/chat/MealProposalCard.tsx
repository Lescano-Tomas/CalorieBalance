import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/frontend/theme';
import { MealProposalPayload, MealSlot, ProposalStatus } from '@/types';

interface MealProposalCardProps {
  proposal: MealProposalPayload;
  status: ProposalStatus;
  onConfirm: (updatedProposal: MealProposalPayload) => Promise<void>;
  loading?: boolean;
}

const SLOT_LABELS: Record<MealSlot | 'snack', { label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  desayuno: { label: 'Desayuno', icon: 'wb-sunny' },
  almuerzo: { label: 'Almuerzo', icon: 'restaurant' },
  merienda: { label: 'Merienda', icon: 'coffee' },
  cena: { label: 'Cena', icon: 'nights-stay' },
  snack: { label: 'Colación', icon: 'apple' },
};

export const MealProposalCard: React.FC<MealProposalCardProps> = ({
  proposal,
  status,
  onConfirm,
  loading = false,
}) => {
  const [editingModal, setEditingModal] = useState<boolean>(false);
  const [items, setItems] = useState<Array<{ title: string; quantity: string; calories: number }>>(
    proposal.items || []
  );
  const [mealSlot, setMealSlot] = useState<MealSlot | 'snack'>(proposal.mealSlot || 'almuerzo');
  const [newItemTitle, setNewItemTitle] = useState<string>('');
  const [newItemQty, setNewItemQty] = useState<string>('');
  const [newItemCals, setNewItemCals] = useState<string>('');

  const isConfirmed = status === 'confirmed';
  const totalCalories = items.reduce((sum, it) => sum + (it.calories || 0), 0);
  const slotInfo = SLOT_LABELS[mealSlot] || SLOT_LABELS.almuerzo;

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    if (!newItemTitle.trim()) {
      Alert.alert('Falta nombre', 'Ingresa el nombre del alimento.');
      return;
    }
    const cals = parseInt(newItemCals, 10);
    if (isNaN(cals) || cals < 0) {
      Alert.alert('Calorías inválidas', 'Ingresa un número válido de calorías.');
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        title: newItemTitle.trim(),
        quantity: newItemQty.trim() || '1 porción',
        calories: cals,
      },
    ]);
    setNewItemTitle('');
    setNewItemQty('');
    setNewItemCals('');
  };

  const handleSaveEdits = () => {
    setEditingModal(false);
  };

  const handleTriggerConfirm = async () => {
    await onConfirm({
      mealSlot,
      items,
      totalCalories,
      cookingFatsAudit: proposal.cookingFatsAudit,
    });
  };

  return (
    <View style={[styles.card, isConfirmed ? styles.cardConfirmed : styles.cardPending]}>
      {/* Header with Slot & Total Calories */}
      <View style={styles.headerRow}>
        <View style={styles.slotBadge}>
          <MaterialIcons
            name={slotInfo.icon}
            size={14}
            color={isConfirmed ? colors.secondary : colors.primary}
          />
          <Text style={[styles.slotBadgeText, isConfirmed && { color: colors.secondary }]}>
            {slotInfo.label}
          </Text>
        </View>

        <View style={styles.caloriesBadge}>
          <Text style={styles.caloriesNumber}>{totalCalories.toLocaleString()}</Text>
          <Text style={styles.caloriesUnit}>kcal</Text>
        </View>
      </View>

      {/* Items Breakdown List */}
      <View style={styles.itemsList}>
        {items.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <View style={styles.itemBullet} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              {!!item.quantity && <Text style={styles.itemQuantity}>{item.quantity}</Text>}
            </View>
            <Text style={styles.itemCalories}>{item.calories} kcal</Text>
          </View>
        ))}
      </View>

      {/* Cooking fats audit note if provided */}
      {!!proposal.cookingFatsAudit && (
        <View style={styles.auditRow}>
          <MaterialIcons name="verified-user" size={13} color={colors.secondary} />
          <Text style={styles.auditText}>{proposal.cookingFatsAudit}</Text>
        </View>
      )}

      {/* Action Buttons: Pending vs Confirmed */}
      {isConfirmed ? (
        <View style={styles.confirmedBanner}>
          <MaterialIcons name="check-circle" size={16} color={colors.secondary} />
          <Text style={styles.confirmedBannerText}>
            Registrado en tu día (+{totalCalories.toLocaleString()} kcal)
          </Text>
        </View>
      ) : (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditingModal(true)}
            activeOpacity={0.7}
            disabled={loading}
          >
            <MaterialIcons name="edit" size={14} color={colors.primary} />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleTriggerConfirm}
            activeOpacity={0.8}
            disabled={loading}
          >
            <MaterialIcons name="add-task" size={16} color="#ffffff" />
            <Text style={styles.confirmButtonText}>
              {loading ? 'Cargando...' : `Confirmar y Cargar (${totalCalories} kcal)`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Modal */}
      <Modal
        visible={editingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <MaterialIcons name="edit-note" size={20} color={colors.primary} />
                <Text style={styles.modalTitle}>Editar desglose de comida</Text>
              </View>
              <TouchableOpacity onPress={() => setEditingModal(false)} hitSlop={10}>
                <MaterialIcons name="close" size={22} color={colors.outline} />
              </TouchableOpacity>
            </View>

            {/* Meal Slot Selector */}
            <View style={styles.slotSelectorRow}>
              {(['desayuno', 'almuerzo', 'merienda', 'cena', 'snack'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.slotChoiceChip,
                    mealSlot === s && styles.slotChoiceChipSelected,
                  ]}
                  onPress={() => setMealSlot(s)}
                >
                  <Text
                    style={[
                      styles.slotChoiceText,
                      mealSlot === s && styles.slotChoiceTextSelected,
                    ]}
                  >
                    {SLOT_LABELS[s].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Editable List */}
            <View style={styles.modalItemList}>
              {items.map((it, idx) => (
                <View key={idx} style={styles.modalItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemTitle}>{it.title}</Text>
                    <Text style={styles.modalItemSub}>
                      {it.quantity} • {it.calories} kcal
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveItem(idx)}
                    style={styles.removeItemBtn}
                  >
                    <MaterialIcons name="delete-outline" size={18} color={colors.tertiary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Quick Add Form */}
            <View style={styles.addMiniForm}>
              <TextInput
                style={[styles.miniInput, { flex: 2 }]}
                placeholder="Alimento o extra"
                placeholderTextColor={colors.outlineVariant}
                value={newItemTitle}
                onChangeText={setNewItemTitle}
              />
              <TextInput
                style={[styles.miniInput, { flex: 1 }]}
                placeholder="Porción (ej. 100g)"
                placeholderTextColor={colors.outlineVariant}
                value={newItemQty}
                onChangeText={setNewItemQty}
              />
              <TextInput
                style={[styles.miniInput, { width: 64, textAlign: 'center' }]}
                placeholder="kcal"
                placeholderTextColor={colors.outlineVariant}
                keyboardType="numeric"
                value={newItemCals}
                onChangeText={setNewItemCals}
              />
              <TouchableOpacity style={styles.addMiniBtn} onPress={handleAddItem}>
                <MaterialIcons name="add" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Total Footer & Confirm Edits */}
            <View style={styles.modalFooter}>
              <Text style={styles.modalTotalText}>
                Total ajustado: <Text style={styles.modalTotalBold}>{totalCalories} kcal</Text>
              </Text>
              <TouchableOpacity style={styles.modalDoneBtn} onPress={handleSaveEdits}>
                <Text style={styles.modalDoneBtnText}>Listo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginTop: 8,
    maxWidth: 380,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardPending: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(102, 85, 118, 0.18)',
  },
  cardConfirmed: {
    backgroundColor: 'rgba(75, 99, 90, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(75, 99, 90, 0.3)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  slotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  slotBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  caloriesBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  caloriesNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.onSurface,
  },
  caloriesUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.outline,
  },
  itemsList: {
    gap: 6,
    marginVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  itemBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  itemQuantity: {
    fontSize: 11,
    color: colors.outline,
  },
  itemCalories: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  auditText: {
    fontSize: 11,
    color: colors.secondary,
    flex: 1,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primaryFixed,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.secondaryFixed,
    marginTop: 10,
  },
  confirmedBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: spacing.md,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  slotSelectorRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  slotChoiceChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.surfaceContainer,
  },
  slotChoiceChipSelected: {
    backgroundColor: colors.primary,
  },
  slotChoiceText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  slotChoiceTextSelected: {
    color: '#ffffff',
  },
  modalItemList: {
    maxHeight: 180,
    marginBottom: 10,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  modalItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  modalItemSub: {
    fontSize: 11,
    color: colors.outline,
  },
  removeItemBtn: {
    padding: 4,
  },
  addMiniForm: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    alignItems: 'center',
  },
  miniInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: colors.onSurface,
  },
  addMiniBtn: {
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  modalTotalText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  modalTotalBold: {
    fontWeight: '800',
    color: colors.primary,
  },
  modalDoneBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalDoneBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
