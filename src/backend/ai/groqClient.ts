import { SettingsRepository } from '@/data/repositories/SettingsRepository';
import { EstimatedFoodItem, EstimationResult } from './nutritionEstimator';
import { CALIBRATED_NUTRITION_PROMPT } from './prompts';

export class GroqClient {
  private static readonly PRIMARY_MODEL = 'openai/gpt-oss-120b';
  private static readonly FALLBACK_MODEL = 'openai/gpt-oss-20b';

  /**
   * Fast meal inference with Groq Cloud (~200ms latency).
   */
  static async estimateMeal(
    text: string,
    userHabitsContext?: string
  ): Promise<EstimationResult | null> {
    const apiKey =
      (await SettingsRepository.getSetting('groq_api_key')) ||
      process.env.EXPO_PUBLIC_GROQ_API_KEY;

    if (!apiKey) return null;

    let systemPrompt = CALIBRATED_NUTRITION_PROMPT;
    if (userHabitsContext) {
      systemPrompt += `\n\nHÁBITOS Y PREFERENCIAS PREVIAS DE ESTA USUARIA (Usa esta memoria si aplica al plato):\n${userHabitsContext}`;
    }

    try {
      const res = await this.callChatCompletion(text, systemPrompt, this.PRIMARY_MODEL, apiKey);
      if (res) return res;
    } catch (primaryErr) {
      console.warn('Groq primary model failed, attempting fallback model:', primaryErr);
      try {
        const fallbackRes = await this.callChatCompletion(
          text,
          systemPrompt,
          this.FALLBACK_MODEL,
          apiKey
        );
        if (fallbackRes) return fallbackRes;
      } catch (fallbackErr) {
        console.warn('Groq fallback model also failed:', fallbackErr);
      }
    }

    return null;
  }

  private static async callChatCompletion(
    text: string,
    systemPrompt: string,
    model: string,
    apiKey: string
  ): Promise<EstimationResult | null> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Comida a desglosar y auditar:\n"${text}"` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) return null;

    const parsed = JSON.parse(rawContent.trim());

    if (Array.isArray(parsed.items) && parsed.items.length > 0) {
      const items: EstimatedFoodItem[] = parsed.items.map((it: any) => ({
        title: String(it.title || it.name || 'Alimento'),
        quantity: String(it.quantity || it.portion || '1 porción'),
        calories: Math.max(0, parseInt(it.calories || it.caloriesPerItem, 10) || 0),
      }));

      const totalCalories =
        typeof parsed.totalCalories === 'number'
          ? parsed.totalCalories
          : items.reduce((sum, it) => sum + it.calories, 0);

      return {
        items,
        totalCalories,
        cookingFatsAudit: parsed.cookingFatsAudit,
        source: 'groq',
      };
    }

    return null;
  }
}
