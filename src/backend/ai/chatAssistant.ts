import {
  ChatMessage,
  UserProfile,
  MealProposalPayload,
  HabitProposalPayload,
  UserHabit,
  MealSlot,
} from '@/types';
import { HabitRepository, SettingsRepository } from '@/data/repositories';
import { CALIBRATED_NUTRITION_PROMPT } from './prompts';

export interface ChatAssistantResponse {
  action: 'propose_meal' | 'propose_habit' | 'message';
  assistantMessage: string;
  mealProposal?: MealProposalPayload;
  habitProposal?: HabitProposalPayload;
  source: 'groq' | 'gemini' | 'offline_fallback';
}

export class ChatAssistant {
  private static readonly GROQ_PRIMARY_MODEL = 'openai/gpt-oss-120b';
  private static readonly GROQ_FALLBACK_MODEL = 'openai/gpt-oss-20b';

  /**
   * Main conversational dispatch: processes user utterance in multi-turn context,
   * classifies intent, and returns structured action (meal proposal, habit proposal, or message).
   */
  static async processMessage(
    userMessage: string,
    history: ChatMessage[],
    userProfile?: UserProfile | null,
    todayStats?: { consumed: number; target: number }
  ): Promise<ChatAssistantResponse> {
    const cleanText = userMessage.trim();
    if (!cleanText) {
      return {
        action: 'message',
        assistantMessage: '¡Hola! Contame qué comiste o qué hábito querés que recuerde.',
        source: 'offline_fallback',
      };
    }

    // 1. Fetch active habits to inject into AI system prompt
    let activeHabits: UserHabit[] = [];
    try {
      activeHabits = await HabitRepository.getActiveHabits();
    } catch (e) {
      console.warn('Could not fetch active habits for chat:', e);
    }

    // 2. Build system prompt
    const systemPrompt = this.buildChatSystemPrompt(activeHabits, userProfile, todayStats);

    // 3. Prepare recent messages context (last 8 messages for context)
    const recentHistory = history.slice(-8).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content:
        m.role === 'assistant' && m.payload_json
          ? `${m.content}\n[Tarjeta propuesta previamente generada]`
          : m.content,
    }));

    // 4. Try Groq (ultra fast inference)
    try {
      const groqApiKey =
        (await SettingsRepository.getSetting('groq_api_key')) ||
        process.env.EXPO_PUBLIC_GROQ_API_KEY;

      if (groqApiKey) {
        const groqResult = await this.callGroq(cleanText, recentHistory, systemPrompt, groqApiKey);
        if (groqResult) return groqResult;
      }
    } catch (err) {
      console.warn('ChatAssistant: Groq failed, falling back to Gemini:', err);
    }

    // 5. Try Gemini (Google AI Studio)
    try {
      const geminiApiKey =
        (await SettingsRepository.getGeminiApiKey()) ||
        process.env.EXPO_PUBLIC_GEMINI_API_KEY;

      if (geminiApiKey) {
        const geminiResult = await this.callGemini(cleanText, recentHistory, systemPrompt, geminiApiKey);
        if (geminiResult) return geminiResult;
      }
    } catch (err) {
      console.warn('ChatAssistant: Gemini failed, falling back to offline:', err);
    }

    // 6. Offline Fallback
    return this.generateOfflineFallback(cleanText, todayStats);
  }

  /**
   * Builds the comprehensive conversational prompt with user habits and metabolic state.
   */
  private static buildChatSystemPrompt(
    activeHabits: UserHabit[],
    userProfile?: UserProfile | null,
    todayStats?: { consumed: number; target: number }
  ): string {
    const userName = userProfile?.name || 'Valen';
    const target = todayStats?.target || userProfile?.target_calories || 1800;
    const consumed = todayStats?.consumed || 0;
    const remaining = target - consumed;

    let habitsSection = 'No hay hábitos personalizados cargados aún.';
    if (activeHabits.length > 0) {
      habitsSection = activeHabits
        .map(
          (h) =>
            `- [${h.category}] ${h.title}: ${h.description} (Regla: ${h.impact_rule || 'Aplicar según corresponda'})`
        )
        .join('\n');
    }

    return `
Eres NutriBot, la asistente nutricional inteligente, cálida y rigurosa de CalorieBalance para ${userName}.
Tu tono es el de una nutricionista clínica argentina: empática, motivadora, precisa, directa y cercana (usando vos/che con moderación y calidez).

ESTADO ACTUAL DE HOY:
- Meta diaria: ${target.toLocaleString()} kcal
- Consumido hoy: ${consumed.toLocaleString()} kcal
- Calorías restantes: ${remaining.toLocaleString()} kcal (${remaining >= 0 ? 'dentro del objetivo' : 'en superávit'})

HÁBITOS CULINARIOS Y PREFERENCIAS ACTIVAS DE ${userName.toUpperCase()}:
${habitsSection}

REGLA DE ORO DE LOS HÁBITOS:
Siempre que ${userName} mencione cocinar, comer milanesas, carnes o ensaladas, DEBES respetar sus hábitos activos (por ejemplo, si usa Fritolín/rocío vegetal, computa 5-10 kcal de spray y NUNCA 119 kcal de aceite líquido; si toma lácteos descremados, usa valores de leche/yogur descremado).

REGLAS DE CLASIFICACIÓN DE INTENCIÓN (DECISIÓN DE ACCIÓN):
1. ACCIÓN "propose_meal":
   - Se activa cuando ${userName} describe lo que comió, bebió o planea comer (ej. "Almorcé 2 empanadas de carne al horno con una ensalada", "Desayuné café con leche y 2 tostadas").
   - Identifica el momento: "desayuno" | "almuerzo" | "merienda" | "cena" | "snack".
   - Desglosa los alimentos en ítems individuales con gramajes realistas de hogar y calorías exactas según la tabla de anclaje Argenfoods/USDA.
   - Aplica la auditoría de grasas respetando sus hábitos.
   - Escribe un mensaje breve, afectuoso y claro invitándola a revisar y confirmar la tarjeta.
   - NUNCA des por confirmada la comida en el texto: la usuaria confirmará con el botón en pantalla.

2. ACCIÓN "propose_habit":
   - Se activa cuando ${userName} expresa una regla de cocina, gusto, manía o preferencia habitual (ej. "Anotá que siempre uso fritolín", "Al café le pongo stevia", "No me gusta la cebolla", "Los domingos como asado").
   - Extrae:
     * category: "cooking_fats" | "dairy" | "taste" | "portion" | "frequent_dish" | "general"
     * title: Nombre conciso (ej. "Rocío vegetal (Fritolín)")
     * description: Descripción clara de lo que hace.
     * impact_rule: Regla calórica (ej. "5 kcal en cocciones en vez de 119 kcal de aceite")
   - Escribe un mensaje de respuesta confirmando que creaste la propuesta para memorizarlo.

3. ACCIÓN "message":
   - Se activa para saludos, dudas nutricionales, preguntas sobre el día (ej. "¿Cómo vengo hoy?", "¿Qué puedo merendar con 200 kcal?"), ánimos o charla general.
   - Responde con claridad, empatía y conocimiento técnico.

TABLA DE REFERENCIA NUTRICIONAL BASE (ARGENFOODS / USDA):
- 1 Empanada al horno: 230 kcal (2 empanadas = 460 kcal).
- 1 Milanesa al horno de carne: 260 kcal. Pollo: 240 kcal. Frita: +100 kcal.
- Puré de papas casero: 195 kcal (180g). Puré de calabaza: 120 kcal (180g).
- Ensalada fresca tomate y lechuga: 45 kcal (140g).
- Tostada integral con queso untable light: 75-80 kcal por unidad.
- Café con leche descremada: 95 kcal (taza 200ml).
- Rocío vegetal en spray: 5-10 kcal por comida. Aceite común: 119 kcal por cucharada (14g).

FORMATO DE SALIDA ESTRICTO:
Debes responder ÚNICAMENTE con un JSON válido con la siguiente estructura:
{
  "action": "propose_meal" | "propose_habit" | "message",
  "assistantMessage": "Texto de tu respuesta empática a ${userName}...",
  "mealProposal": {
    "mealSlot": "desayuno" | "almuerzo" | "merienda" | "cena" | "snack",
    "items": [
      { "title": "Nombre alimento", "quantity": "Porción/gramos", "calories": 120 }
    ],
    "totalCalories": 120,
    "cookingFatsAudit": "Nota de grasas auditadas según hábitos"
  },
  "habitProposal": {
    "category": "cooking_fats" | "dairy" | "taste" | "portion" | "frequent_dish" | "general",
    "title": "Título corto",
    "description": "Detalle del hábito",
    "impact_rule": "Impacto calórico"
  }
}
Si la acción es "message", omite mealProposal y habitProposal.
Si la acción es "propose_meal", omite habitProposal.
Si la acción es "propose_habit", omite mealProposal.
`.trim();
  }

  /**
   * Call Groq Cloud API with JSON format and deterministic parameters.
   */
  private static async callGroq(
    userMessage: string,
    history: Array<{ role: string; content: string }>,
    systemPrompt: string,
    apiKey: string
  ): Promise<ChatAssistantResponse | null> {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage },
    ];

    const modelsToTry = [this.GROQ_PRIMARY_MODEL, this.GROQ_FALLBACK_MODEL];

    for (const model of modelsToTry) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            response_format: { type: 'json_object' },
            temperature: 0.0,
            seed: 42,
            max_tokens: 1000,
          }),
        });

        if (!response.ok) {
          console.warn(`Groq chat ${model} HTTP error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) continue;

        const parsed = JSON.parse(content.trim());
        const validated = this.validateAndNormalizeResponse(parsed, 'groq');
        if (validated) return validated;
      } catch (err) {
        console.warn(`Groq model ${model} chat error:`, err);
      }
    }

    return null;
  }

  /**
   * Call Google Gemini API as intelligent fallback.
   */
  private static async callGemini(
    userMessage: string,
    history: Array<{ role: string; content: string }>,
    systemPrompt: string,
    apiKey: string
  ): Promise<ChatAssistantResponse | null> {
    const historyText = history.map((h) => `${h.role === 'user' ? 'Usuaria' : 'NutriBot'}: ${h.content}`).join('\n');
    const promptWithHistory = `${systemPrompt}\n\nHISTORIAL PREVIO DE LA CONVERSACIÓN:\n${historyText}\n\nMENSAJE ACTUAL DE LA USUARIA:\n"${userMessage}"`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: promptWithHistory }],
            },
          ],
          generationConfig: {
            temperature: 0.0,
            seed: 42,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini Chat HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) return null;

    const parsed = JSON.parse(rawContent.trim());
    return this.validateAndNormalizeResponse(parsed, 'gemini');
  }

  /**
   * Validates and normalizes structured response from LLM.
   */
  private static validateAndNormalizeResponse(
    parsed: any,
    source: 'groq' | 'gemini'
  ): ChatAssistantResponse | null {
    if (!parsed || typeof parsed !== 'object') return null;

    const action = parsed.action;
    const assistantMessage =
      String(parsed.assistantMessage || parsed.message || 'Entendido.').trim();

    if (action === 'propose_meal' && parsed.mealProposal) {
      const rawItems = parsed.mealProposal.items;
      if (Array.isArray(rawItems) && rawItems.length > 0) {
        const items = rawItems.map((it: any) => ({
          title: String(it.title || 'Alimento').trim(),
          quantity: String(it.quantity || '1 porción').trim(),
          calories: Math.max(0, parseInt(it.calories, 10) || 0),
        }));

        const totalCalories =
          typeof parsed.mealProposal.totalCalories === 'number'
            ? parsed.mealProposal.totalCalories
            : items.reduce((sum, it) => sum + it.calories, 0);

        const mealSlot: MealSlot | 'snack' = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack'].includes(
          parsed.mealProposal.mealSlot
        )
          ? parsed.mealProposal.mealSlot
          : 'almuerzo';

        return {
          action: 'propose_meal',
          assistantMessage,
          mealProposal: {
            mealSlot,
            items,
            totalCalories,
            cookingFatsAudit: parsed.mealProposal.cookingFatsAudit,
          },
          source,
        };
      }
    }

    if (action === 'propose_habit' && parsed.habitProposal) {
      const h = parsed.habitProposal;
      const category = ['cooking_fats', 'dairy', 'taste', 'portion', 'frequent_dish', 'general'].includes(
        h.category
      )
        ? h.category
        : 'general';

      return {
        action: 'propose_habit',
        assistantMessage,
        habitProposal: {
          category,
          title: String(h.title || 'Hábito culinario').trim(),
          description: String(h.description || '').trim(),
          impact_rule: h.impact_rule ? String(h.impact_rule).trim() : undefined,
        },
        source,
      };
    }

    // Default to plain message
    return {
      action: 'message',
      assistantMessage,
      source,
    };
  }

  /**
   * Offline heuristic fallback if internet / APIs are unreachable.
   */
  private static generateOfflineFallback(
    text: string,
    todayStats?: { consumed: number; target: number }
  ): ChatAssistantResponse {
    const lower = text.toLowerCase();

    // Check if user is expressing a habit
    if (
      lower.includes('no uso aceite') ||
      lower.includes('fritolín') ||
      lower.includes('rocío vegetal') ||
      lower.includes('descremad') ||
      lower.includes('endulzo') ||
      lower.includes('stevia') ||
      lower.includes('hábito') ||
      lower.includes('acordate')
    ) {
      return {
        action: 'propose_habit',
        assistantMessage:
          '¡Anotado sin conexión! Detecté este hábito culinario para recordar en tus comidas:',
        habitProposal: {
          category: lower.includes('aceite') || lower.includes('fritolín') ? 'cooking_fats' : 'dairy',
          title: lower.includes('fritolín') ? 'Rocío vegetal (Fritolín)' : 'Preferencia culinaria',
          description: text,
          impact_rule: 'Ahorro calórico en cocción/aderezos',
        },
        source: 'offline_fallback',
      };
    }

    // Check if user is logging food
    if (
      lower.includes('comí') ||
      lower.includes('desayuné') ||
      lower.includes('almorcé') ||
      lower.includes('merendé') ||
      lower.includes('cené') ||
      lower.includes('empanada') ||
      lower.includes('milanesa') ||
      lower.includes('ensalada') ||
      lower.includes('café') ||
      lower.includes('tostada')
    ) {
      let slot: MealSlot | 'snack' = 'almuerzo';
      if (lower.includes('desayun')) slot = 'desayuno';
      else if (lower.includes('merend')) slot = 'merienda';
      else if (lower.includes('cen')) slot = 'cena';

      let items = [{ title: text, quantity: '1 porción estimada', calories: 350 }];
      if (lower.includes('empanada')) {
        items = [{ title: 'Empanadas al horno', quantity: '2 unidades (170g)', calories: 460 }];
      } else if (lower.includes('café') || lower.includes('tostada')) {
        items = [
          { title: 'Café con leche descremada', quantity: '1 taza (200ml)', calories: 95 },
          { title: 'Tostadas con queso untable', quantity: '2 unidades', calories: 145 },
        ];
      }

      const total = items.reduce((s, i) => s + i.calories, 0);

      return {
        action: 'propose_meal',
        assistantMessage:
          'Estimé esta comida con el motor local argentino. Revisá los valores y confirmala si está ok:',
        mealProposal: {
          mealSlot: slot,
          items,
          totalCalories: total,
          cookingFatsAudit: 'Modo local sin conexión activado',
        },
        source: 'offline_fallback',
      };
    }

    // Informational response
    const remaining = (todayStats?.target || 1800) - (todayStats?.consumed || 0);
    return {
      action: 'message',
      assistantMessage: `¡Hola! Hoy llevás ${todayStats?.consumed || 0} kcal consumidas (te quedan ${remaining} kcal para tu meta). Podés contarme qué comiste o pedirme que recuerde tus hábitos de cocina.`,
      source: 'offline_fallback',
    };
  }
}
