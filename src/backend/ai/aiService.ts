import { SYSTEM_NUTRITION_PROMPT } from './prompts';

export interface AIAnalysisResult {
  estimatedCalories: number;
  confidence: number;
  breakdown: string;
  mindfulTip: string;
}

export class AIService {
  private static apiKey: string | null = null;

  public static setApiKey(key: string) {
    this.apiKey = key;
  }

  public static async estimateCalories(text: string): Promise<AIAnalysisResult> {
    if (!text || text.trim() === '') {
      return {
        estimatedCalories: 0,
        confidence: 0,
        breakdown: 'Sin descripción ingresada',
        mindfulTip: 'Registra tus comidas con honestidad y calma.',
      };
    }

    const matchNumber = text.match(/(\d{3,4})\s*(kcal)?/i);
    if (matchNumber) {
      const val = parseInt(matchNumber[1], 10);
      return {
        estimatedCalories: val,
        confidence: 0.95,
        breakdown: 'Lectura numérica directa',
        mindfulTip: this.getTipForCalories(val, 1800),
      };
    }

    if (this.apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${SYSTEM_NUTRITION_PROMPT}\n\nAlimentos consumidos: "${text}"`,
                    },
                  ],
                },
              ],
            }),
          }
        );
        const data = await response.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const parsed = JSON.parse(rawJson.replace(/```json|```/g, '').trim());
          return {
            estimatedCalories: parsed.calories || 500,
            confidence: 0.9,
            breakdown: parsed.explanation || 'Estimado con Gemini 1.5 Flash',
            mindfulTip: parsed.tip || this.getTipForCalories(parsed.calories || 500, 1800),
          };
        }
      } catch (err) {
        console.warn('Gemini API call fallback to heuristic:', err);
      }
    }

    // Heuristic fallback
    let estimated = 550;
    const lower = text.toLowerCase();
    if (lower.includes('ensalada') || lower.includes('fruta') || lower.includes('yogur')) {
      estimated = 320;
    } else if (lower.includes('pizza') || lower.includes('hamburguesa') || lower.includes('frito')) {
      estimated = 850;
    } else if (lower.includes('pollo') || lower.includes('pescado') || lower.includes('carne')) {
      estimated = 620;
    }

    return {
      estimatedCalories: estimated,
      confidence: 0.8,
      breakdown: `Estimado sugerido por IA offline para "${text.slice(0, 30)}..."`,
      mindfulTip: this.getTipForCalories(estimated, 1800),
    };
  }

  public static getTipForCalories(consumed: number, target: number = 1800): string {
    const diff = consumed - target;
    if (diff <= -300) {
      return 'Déficit significativo y sostenible. Asegúrate de incluir suficiente proteína e hidratación.';
    } else if (diff <= 0) {
      return 'Buen balance calórico hoy manteniendo un ritmo sostenible. Hidrátate con calma antes de cenar.';
    } else if (diff <= 250) {
      return 'Ligeramente por encima del umbral planificado. No te preocupes, el balance semanal es lo primordial.';
    } else {
      return 'Día calóricamente alto. Es parte del proceso natural; retoma con tranquilidad tu rutina mañana.';
    }
  }
}
