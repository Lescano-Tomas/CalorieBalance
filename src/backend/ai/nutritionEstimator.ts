import { CALIBRATED_NUTRITION_PROMPT } from './prompts';
import { SettingsRepository } from '@/data/repositories';

export interface EstimatedFoodItem {
  title: string;
  quantity: string;
  calories: number;
}

export interface EstimationResult {
  items: EstimatedFoodItem[];
  totalCalories: number;
  cookingFatsAudit?: string;
  source: 'gemini' | 'local_heuristic';
}

export class NutritionEstimator {
  /**
   * Main entry point to estimate meal ingredients, grammages, and calories.
   */
  static async estimateMeal(text: string): Promise<EstimationResult> {
    const cleanText = text.trim();
    if (!cleanText) {
      return {
        items: [],
        totalCalories: 0,
        source: 'local_heuristic',
      };
    }

    // 1. Check for Gemini API key
    const apiKey = (await SettingsRepository.getGeminiApiKey()) || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (apiKey) {
      try {
        const geminiResult = await this.callGeminiApi(cleanText, apiKey);
        if (geminiResult && geminiResult.items.length > 0) {
          return geminiResult;
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to local heuristic:', err);
      }
    }

    // 2. Fallback to calibrated Argentine heuristic engine
    return this.estimateLocalHeuristic(cleanText);
  }

  /**
   * Calls Google Gemini 1.5/2.0 Flash API with structured JSON output.
   */
  private static async callGeminiApi(
    text: string,
    apiKey: string
  ): Promise<EstimationResult | null> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${CALIBRATED_NUTRITION_PROMPT}\n\nComida a analizar:\n"${text}"`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawJson) return null;

    const parsed = JSON.parse(rawJson.replace(/```json|```/g, '').trim());

    if (Array.isArray(parsed.items) && parsed.items.length > 0) {
      const items: EstimatedFoodItem[] = parsed.items.map((it: any) => ({
        title: String(it.title || 'Alimento'),
        quantity: String(it.quantity || '1 porción'),
        calories: Math.max(0, parseInt(it.calories, 10) || 0),
      }));

      const totalCalories =
        typeof parsed.totalCalories === 'number'
          ? parsed.totalCalories
          : items.reduce((sum, it) => sum + it.calories, 0);

      return {
        items,
        totalCalories,
        cookingFatsAudit: parsed.cookingFatsAudit,
        source: 'gemini',
      };
    }

    return null;
  }

  /**
   * Calibrated local heuristic engine for Argentine home meals.
   * Catches typical foods, assigns home-cooked grammage and audits cooking oils.
   */
  private static estimateLocalHeuristic(text: string): EstimationResult {
    const lower = text.toLowerCase();
    const items: EstimatedFoodItem[] = [];
    let hadSalad = false;
    let hadCookingOilAudit = false;

    // 1. Milanesas
    if (lower.includes('milanesa de pollo') || lower.includes('suprema')) {
      const isFried = lower.includes('frita');
      items.push({
        title: isFried ? 'Milanesa de pollo frita' : 'Milanesa de pollo al horno',
        quantity: '150g (1 unidad)',
        calories: isFried ? 340 : 260,
      });
    } else if (lower.includes('milanesa')) {
      const isFried = lower.includes('frita');
      items.push({
        title: isFried ? 'Milanesa de carne frita' : 'Milanesa de carne al horno',
        quantity: '140g (1 unidad)',
        calories: isFried ? 360 : 275,
      });
    }

    // 2. Puré
    if (lower.includes('pure') || lower.includes('puré')) {
      if (lower.includes('calabaza')) {
        items.push({
          title: 'Puré de calabaza casero',
          quantity: '180g (1 porción)',
          calories: 120,
        });
      } else {
        items.push({
          title: 'Puré de papas casero (c/leche)',
          quantity: '180g (1 porción)',
          calories: 195,
        });
      }
    }

    // 3. Ensaladas
    if (lower.includes('ensalada') || lower.includes('lechuga') || lower.includes('tomate')) {
      hadSalad = true;
      items.push({
        title: 'Ensalada fresca de tomate y hojas verdes',
        quantity: '140g (1 plato chico)',
        calories: 45,
      });
    }

    // 4. Empanadas
    const empanadaMatch = lower.match(/(\d+)\s*(empanada|empanadas)/);
    if (empanadaMatch) {
      const count = parseInt(empanadaMatch[1], 10) || 2;
      items.push({
        title: `Empanadas de carne/jamón y queso al horno (${count} un)`,
        quantity: `${count * 85}g (${count} unidades)`,
        calories: count * 230,
      });
    } else if (lower.includes('empanada')) {
      items.push({
        title: 'Empanada al horno',
        quantity: '85g (1 unidad)',
        calories: 230,
      });
    }

    // 5. Pastas / Fideos
    if (lower.includes('fideo') || lower.includes('fideos') || lower.includes('pasta') || lower.includes('tallarines')) {
      items.push({
        title: 'Fideos con tuco/salsa de tomate',
        quantity: '220g cocidos (1 plato)',
        calories: 360,
      });
      items.push({
        title: 'Queso rallado sardo/reggianito',
        quantity: '1 cda colmada (12g)',
        calories: 48,
      });
    }

    // 6. Arroz
    if (lower.includes('arroz')) {
      if (lower.includes('pollo')) {
        items.push({
          title: 'Arroz con pollo y vegetales',
          quantity: '250g (1 plato)',
          calories: 380,
        });
      } else if (lower.includes('atun') || lower.includes('atún')) {
        items.push({
          title: 'Arroz con atún al natural',
          quantity: '220g (1 plato)',
          calories: 310,
        });
      } else {
        items.push({
          title: 'Arroz blanco cocido',
          quantity: '150g (1 taza)',
          calories: 195,
        });
      }
    }

    // 7. Huevos
    if (lower.includes('huevo') || lower.includes('huevos')) {
      const isFried = lower.includes('frito');
      const countMatch = lower.match(/(\d+)\s*(huevo|huevos)/);
      const count = countMatch ? parseInt(countMatch[1], 10) : 2;
      items.push({
        title: isFried ? `Huevos fritos (${count} un)` : `Huevos revueltos/duros (${count} un)`,
        quantity: `${count} unidades (~${count * 55}g)`,
        calories: count * (isFried ? 115 : 78),
      });
    }

    // 8. Tostadas y Desayuno
    if (lower.includes('tostada') || lower.includes('tostadas')) {
      items.push({
        title: 'Tostadas de pan de mesa con queso untable',
        quantity: '2 unidades + 30g queso',
        calories: 175,
      });
    }

    if (lower.includes('cafe con leche') || lower.includes('café con leche')) {
      items.push({
        title: 'Café con leche descremada',
        quantity: '200 ml (1 taza)',
        calories: 95,
      });
    }

    // 9. Carnes
    if (lower.includes('bife') || lower.includes('carne') || lower.includes('asado')) {
      items.push({
        title: 'Corte de carne vacuna magra a la plancha',
        quantity: '180g',
        calories: 290,
      });
    } else if (lower.includes('pechuga') && !lower.includes('milanesa')) {
      items.push({
        title: 'Pechuga de pollo a la plancha',
        quantity: '160g',
        calories: 240,
      });
    }

    // 10. Pizza
    if (lower.includes('pizza')) {
      items.push({
        title: 'Pizza de muzzarella a la piedra',
        quantity: '2 porciones (~180g)',
        calories: 520,
      });
    }

    // 11. Tarta
    if (lower.includes('tarta')) {
      items.push({
        title: 'Tarta de verduras / jamón y queso',
        quantity: '1 porción grande (160g)',
        calories: 310,
      });
    }

    // Mandatory Hidden Oils Audit: if salad was present and no oil was specified
    if (hadSalad && !lower.includes('sin aceite')) {
      items.push({
        title: 'Aceite de oliva (aderezo ensalada)',
        quantity: '1 cda sopera (14g)',
        calories: 119,
      });
      hadCookingOilAudit = true;
    }

    // If no specific patterns matched, provide a balanced estimate
    if (items.length === 0) {
      items.push({
        title: text.length > 35 ? text.slice(0, 35) + '...' : text,
        quantity: '1 porción estándar (~250g)',
        calories: 450,
      });
      items.push({
        title: 'Aceite de cocción estimado',
        quantity: '1 cda (12g)',
        calories: 105,
      });
      hadCookingOilAudit = true;
    }

    const totalCalories = items.reduce((sum, it) => sum + it.calories, 0);

    return {
      items,
      totalCalories,
      cookingFatsAudit: hadCookingOilAudit
        ? 'Auditoría automática: incluye 1 cda de aceite de aderezo/cocción (~119 kcal) para un cálculo calórico real.'
        : undefined,
      source: 'local_heuristic',
    };
  }
}
