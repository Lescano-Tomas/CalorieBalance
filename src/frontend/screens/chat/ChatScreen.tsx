import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/frontend/theme';
import { Toast } from '@/frontend/components/common';
import {
  MealProposalCard,
  HabitProposalCard,
  ChatInputBar,
} from '@/frontend/components/chat';
import { RoutinePresetsBar } from '@/frontend/components/routines';
import {
  ChatMessage,
  UserProfile,
  MealProposalPayload,
  HabitProposalPayload,
  MealSlot,
} from '@/types';
import {
  ChatMessageRepository,
  DailyLogRepository,
  MealEntryRepository,
  HabitRepository,
  FoodMemoryRepository,
} from '@/data/repositories';
import { ChatAssistant } from '@/backend/ai/chatAssistant';

interface ChatScreenProps {
  onDataChanged?: () => void;
  userProfile?: UserProfile | null;
}

const QUICK_PROMPTS = [
  'Desayuné café c/leche y tostadas integrales',
  'Almorcé 2 empanadas de carne y ensalada',
  'Anotá que cocino todo con fritolín y no uso aceite',
  '¿Cómo vengo hoy con mis calorías?',
];

export const ChatScreen: React.FC<ChatScreenProps> = ({
  onDataChanged,
  userProfile,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [todayCalories, setTodayCalories] = useState<number>(0);
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const scrollRef = useRef<ScrollView>(null);
  const targetCalories = userProfile?.target_calories || 1800;

  const formatDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
  };

  const todayStr = formatDateStr(new Date());

  useEffect(() => {
    loadChatAndStatus();
  }, [userProfile]);

  const loadChatAndStatus = async () => {
    try {
      // 1. Load today calories
      const log = await DailyLogRepository.getByDate(todayStr);
      setTodayCalories(log ? log.calories_consumed : 0);

      // 2. Load recent messages
      const recent = await ChatMessageRepository.getRecentMessages(60);
      if (recent.length > 0) {
        setMessages(recent);
      } else {
        // Welcome message
        const welcome = await ChatMessageRepository.addMessage(
          'assistant',
          `¡Hola ${userProfile?.name || 'Valen'}! Soy tu asistente de CalorieBalance.
Contame qué comiste hoy y te armo el desglose para confirmar, o enseñame tus gustos y hábitos de cocina (por ejemplo, con qué aceite cocinás o si tomás leche descremada) para que los recuerde en cada cálculo.`
        );
        setMessages([welcome]);
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 200);
    } catch (err) {
      console.warn('Error loading chat:', err);
    }
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    // Add user message to SQLite and state
    const userMsg = await ChatMessageRepository.addMessage('user', text.trim());
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await ChatAssistant.processMessage(
        text.trim(),
        updatedMessages,
        userProfile,
        { consumed: todayCalories, target: targetCalories }
      );

      let assistantMsg: ChatMessage;

      if (response.action === 'propose_meal' && response.mealProposal) {
        assistantMsg = await ChatMessageRepository.addMessage(
          'assistant',
          response.assistantMessage,
          'meal_proposal',
          JSON.stringify(response.mealProposal),
          'pending'
        );
      } else if (response.action === 'propose_habit' && response.habitProposal) {
        assistantMsg = await ChatMessageRepository.addMessage(
          'assistant',
          response.assistantMessage,
          'habit_proposal',
          JSON.stringify(response.habitProposal),
          'pending'
        );
      } else {
        assistantMsg = await ChatMessageRepository.addMessage(
          'assistant',
          response.assistantMessage,
          'text',
          undefined,
          'normal'
        );
      }

      setMessages((prev) => [...prev, assistantMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (err: any) {
      console.error('Chat error:', err);
      const fallbackMsg = await ChatMessageRepository.addMessage(
        'assistant',
        'Tuve un inconveniente al procesar el mensaje. Por favor intenta de nuevo.'
      );
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMeal = async (messageId: number, proposal: MealProposalPayload) => {
    try {
      // 1. Get or create daily log for today
      let log = await DailyLogRepository.getByDate(todayStr);
      let currentLogId = log?.id;
      const newTotal = (log ? log.calories_consumed : 0) + proposal.totalCalories;

      if (!currentLogId) {
        const createdLog = await DailyLogRepository.saveLog(
          todayStr,
          newTotal,
          targetCalories,
          undefined,
          userProfile?.id
        );
        currentLogId = createdLog.id;
      } else {
        await DailyLogRepository.saveLog(
          todayStr,
          newTotal,
          targetCalories,
          undefined,
          userProfile?.id
        );
      }

      // 2. Add meals to meal_entries
      await MealEntryRepository.addBatchMeals(
        currentLogId,
        proposal.items.map((it) => ({
          title: it.title,
          calories: it.calories,
          quantity: it.quantity,
        }))
      );

      // 3. Save to food memory in background
      const mealTitle = proposal.items.map((i) => i.title).join(', ');
      FoodMemoryRepository.saveOrUpdateMemory(
        mealTitle,
        proposal.items,
        proposal.totalCalories
      ).catch((e) => console.warn('Food memory save failed:', e));

      // 4. Update message status in SQLite and state
      await ChatMessageRepository.updateStatus(messageId, 'confirmed', JSON.stringify(proposal));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, status: 'confirmed', payload_json: JSON.stringify(proposal) }
            : m
        )
      );

      setTodayCalories(newTotal);
      showNotification(`¡Comida registrada! +${proposal.totalCalories} kcal en tu día`);
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo guardar la comida: ' + err?.message);
    }
  };

  const handleConfirmHabit = async (messageId: number, habit: HabitProposalPayload) => {
    try {
      await HabitRepository.addHabit(
        habit.category,
        habit.title,
        habit.description,
        habit.impact_rule
      );

      await ChatMessageRepository.updateStatus(messageId, 'confirmed', JSON.stringify(habit));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, status: 'confirmed', payload_json: JSON.stringify(habit) }
            : m
        )
      );

      showNotification('¡Hábito culinario memorizado! ⭐ Se usará en tus próximos cálculos');
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo guardar el hábito: ' + err?.message);
    }
  };

  const handleRoutineLog = async (
    items: Array<{ title: string; quantity: string; calories: number }>,
    totalCalories: number,
    slot: MealSlot
  ) => {
    try {
      let log = await DailyLogRepository.getByDate(todayStr);
      let currentLogId = log?.id;
      const newTotal = (log ? log.calories_consumed : 0) + totalCalories;

      if (!currentLogId) {
        const createdLog = await DailyLogRepository.saveLog(
          todayStr,
          newTotal,
          targetCalories,
          undefined,
          userProfile?.id
        );
        currentLogId = createdLog.id;
      } else {
        await DailyLogRepository.saveLog(
          todayStr,
          newTotal,
          targetCalories,
          undefined,
          userProfile?.id
        );
      }

      await MealEntryRepository.addBatchMeals(
        currentLogId,
        items.map((it) => ({
          title: it.title,
          calories: it.calories,
          quantity: it.quantity,
        }))
      );

      setTodayCalories(newTotal);

      // Add a clean assistant note in the chat
      const logNote = await ChatMessageRepository.addMessage(
        'assistant',
        `⚡ Cargaste tu rutina de **${slot.toUpperCase()}** (+${totalCalories} kcal). ¡Sumado al registro de hoy!`
      );
      setMessages((prev) => [...prev, logNote]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);

      showNotification(`¡${slot.toUpperCase()} cargado en 2 taps! (+${totalCalories} kcal)`);
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo cargar la rutina: ' + err?.message);
    }
  };

  const handleClearChat = () => {
    Alert.alert(
      'Vaciar conversación',
      '¿Querés borrar los mensajes del chat? Los registros de comidas y hábitos ya guardados no se borrarán.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar',
          style: 'destructive',
          onPress: async () => {
            await ChatMessageRepository.clearHistory();
            const fresh = await ChatMessageRepository.addMessage(
              'assistant',
              'Conversación reiniciada. ¿Qué comiste o qué hábito querés registrar?'
            );
            setMessages([fresh]);
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Top Banner: Status & Clear Action */}
      <View style={styles.topBar}>
        <View style={styles.topBarStats}>
          <Text style={styles.topBarLabel}>HOY CONSUMIDO:</Text>
          <Text style={styles.topBarCals}>
            {todayCalories.toLocaleString()} / {targetCalories.toLocaleString()} kcal
          </Text>
        </View>

        <TouchableOpacity
          style={styles.clearBtn}
          onPress={handleClearChat}
          hitSlop={10}
        >
          <MaterialIcons name="delete-sweep" size={20} color={colors.outline} />
        </TouchableOpacity>
      </View>

      {/* Routine Presets Bar for 2-tap fast loading */}
      <View style={styles.routinePresetsWrapper}>
        <RoutinePresetsBar onLogMeal={handleRoutineLog} compact />
      </View>

      {/* Messages Scroll Area */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((m) => {
          const isUser = m.role === 'user';
          let mealPayload: MealProposalPayload | null = null;
          let habitPayload: HabitProposalPayload | null = null;

          if (m.message_type === 'meal_proposal' && m.payload_json) {
            try {
              mealPayload = JSON.parse(m.payload_json);
            } catch {
              mealPayload = null;
            }
          } else if (m.message_type === 'habit_proposal' && m.payload_json) {
            try {
              habitPayload = JSON.parse(m.payload_json);
            } catch {
              habitPayload = null;
            }
          }

          return (
            <View
              key={m.id}
              style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowAssistant,
              ]}
            >
              {!isUser && (
                <View style={styles.botAvatarCircle}>
                  <MaterialIcons name="auto-awesome" size={16} color={colors.primary} />
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  isUser ? styles.bubbleUser : styles.bubbleAssistant,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                  ]}
                >
                  {m.content}
                </Text>

                {/* Render Outcome Proposal Card if applicable */}
                {mealPayload && (
                  <MealProposalCard
                    proposal={mealPayload}
                    status={m.status}
                    onConfirm={(updated) => handleConfirmMeal(m.id, updated)}
                  />
                )}

                {habitPayload && (
                  <HabitProposalCard
                    proposal={habitPayload}
                    status={m.status}
                    onConfirm={(updated) => handleConfirmHabit(m.id, updated)}
                  />
                )}
              </View>
            </View>
          );
        })}

        {loading && (
          <View style={styles.loadingRow}>
            <View style={styles.botAvatarCircle}>
              <MaterialIcons name="auto-awesome" size={16} color={colors.primary} />
            </View>
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>NutriBot está analizando...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Prompt Suggestion Chips */}
      <View style={styles.suggestionsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsList}>
          {QUICK_PROMPTS.map((prompt, i) => (
            <TouchableOpacity
              key={i}
              style={styles.suggestionChip}
              onPress={() => handleSendMessage(prompt)}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.suggestionChipText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bottom Text Input Bar */}
      <ChatInputBar onSendMessage={handleSendMessage} loading={loading} />

      {/* Floating Feedback Toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        onHide={() => setToastVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(102, 85, 118, 0.06)',
  },
  topBarStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBarLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.outline,
    letterSpacing: 0.5,
  },
  topBarCals: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  clearBtn: {
    padding: 4,
  },
  routinePresetsWrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: 8,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  botAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '84%',
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(102, 85, 118, 0.1)',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: '#ffffff',
    fontWeight: '500',
  },
  bubbleTextAssistant: {
    color: colors.onSurface,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  loadingText: {
    fontSize: 12,
    color: colors.outline,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  suggestionsList: {
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  suggestionChip: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(102, 85, 118, 0.1)',
  },
  suggestionChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
});
