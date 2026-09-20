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
import { HabitCategory, HabitProposalPayload, ProposalStatus } from '@/types';

interface HabitProposalCardProps {
  proposal: HabitProposalPayload;
  status: ProposalStatus;
  onConfirm: (updated: HabitProposalPayload) => Promise<void>;
  loading?: boolean;
}

const CATEGORY_MAP: Record<HabitCategory, { label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  cooking_fats: { label: 'Grasas & Cocción', icon: 'outdoor-grill' },
  dairy: { label: 'Lácteos', icon: 'local-cafe' },
  taste: { label: 'Gusto Personal', icon: 'favorite' },
  portion: { label: 'Tamaño de Porción', icon: 'straighten' },
  frequent_dish: { label: 'Plato Frecuente', icon: 'restaurant-menu' },
  general: { label: 'Hábito Culinario', icon: 'lightbulb' },
};

export const HabitProposalCard: React.FC<HabitProposalCardProps> = ({
  proposal,
  status,
  onConfirm,
  loading = false,
}) => {
  const [editingModal, setEditingModal] = useState<boolean>(false);
  const [title, setTitle] = useState<string>(proposal.title);
  const [description, setDescription] = useState<string>(proposal.description);
  const [impactRule, setImpactRule] = useState<string>(proposal.impact_rule || '');

  const isConfirmed = status === 'confirmed';
  const categoryInfo = CATEGORY_MAP[proposal.category] || CATEGORY_MAP.general;

  const handleSaveEdits = () => {
    if (!title.trim()) {
      Alert.alert('Falta título', 'Por favor ingresa un título para el hábito.');
      return;
    }
    setEditingModal(false);
  };

  const handleTriggerConfirm = async () => {
    await onConfirm({
      category: proposal.category,
      title: title.trim(),
      description: description.trim(),
      impact_rule: impactRule.trim() || undefined,
    });
  };

  return (
    <View style={[styles.card, isConfirmed ? styles.cardConfirmed : styles.cardPending]}>
      {/* Header with Category Badge */}
      <View style={styles.headerRow}>
        <View style={styles.categoryBadge}>
          <MaterialIcons name={categoryInfo.icon} size={14} color={colors.primary} />
          <Text style={styles.categoryBadgeText}>{categoryInfo.label}</Text>
        </View>

        <View style={styles.flagBadge}>
          <MaterialIcons name="auto-awesome" size={12} color={colors.primary} />
          <Text style={styles.flagBadgeText}>Hábito detectado</Text>
        </View>
      </View>

      {/* Main Content */}
      <Text style={styles.titleText}>{title}</Text>
      {!!description && <Text style={styles.descriptionText}>{description}</Text>}

      {/* Caloric impact rule */}
      {!!impactRule && (
        <View style={styles.impactBox}>
          <MaterialIcons name="trending-down" size={14} color={colors.secondary} />
          <Text style={styles.impactText}>Regla: {impactRule}</Text>
        </View>
      )}

      {/* Actions */}
      {isConfirmed ? (
        <View style={styles.confirmedBanner}>
          <MaterialIcons name="star" size={15} color={colors.primary} />
          <Text style={styles.confirmedBannerText}>
            Hábito guardado y activo en tu memoria IA
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
            <MaterialIcons name="bookmark-add" size={15} color="#ffffff" />
            <Text style={styles.confirmButtonText}>
              {loading ? 'Guardando...' : 'Guardar en mis Hábitos'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Habit Modal */}
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
                <Text style={styles.modalTitle}>Editar Hábito / Gusto</Text>
              </View>
              <TouchableOpacity onPress={() => setEditingModal(false)} hitSlop={10}>
                <MaterialIcons name="close" size={22} color={colors.outline} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Título del hábito</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="ej: Rocío vegetal (Fritolín)"
                placeholderTextColor={colors.outlineVariant}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Descripción o costumbre</Text>
              <TextInput
                style={[styles.input, { height: 64, textAlignVertical: 'top' }]}
                value={description}
                onChangeText={setDescription}
                placeholder="ej: Cocino todo con fritolín y no uso aceite líquido"
                placeholderTextColor={colors.outlineVariant}
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Regla calórica (opcional)</Text>
              <TextInput
                style={styles.input}
                value={impactRule}
                onChangeText={setImpactRule}
                placeholder="ej: 5-10 kcal en lugar de 119 kcal"
                placeholderTextColor={colors.outlineVariant}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveEdits}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveBtnText}>Listo</Text>
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
    borderColor: 'rgba(102, 85, 118, 0.2)',
  },
  cardConfirmed: {
    backgroundColor: 'rgba(102, 85, 118, 0.06)',
    borderWidth: 1.5,
    borderColor: colors.primaryFixedDim,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  flagBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 8,
  },
  impactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 6,
  },
  impactText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
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
    backgroundColor: colors.surfaceContainer,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    backgroundColor: colors.primaryFixed,
    marginTop: 8,
  },
  confirmedBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
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
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.onSurface,
  },
  modalFooter: {
    alignItems: 'flex-end',
    marginTop: 6,
  },
  modalSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
