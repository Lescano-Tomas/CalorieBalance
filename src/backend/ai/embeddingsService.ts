import { SettingsRepository } from '@/data/repositories/SettingsRepository';

export class EmbeddingsService {
  private static cache = new Map<string, number[]>();

  /**
   * Generates a 768-dimensional semantic embedding for food descriptions.
   * Uses Google AI Studio gemini-embedding-001 with fallback to local n-gram vectorizer if offline.
   */
  static async getEmbedding(text: string): Promise<number[]> {
    const cleanText = text.trim().toLowerCase();
    if (!cleanText) return new Array(768).fill(0);

    if (this.cache.has(cleanText)) {
      return this.cache.get(cleanText)!;
    }

    const apiKey =
      (await SettingsRepository.getGeminiApiKey()) || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/gemini-embedding-001',
              content: { parts: [{ text: cleanText }] },
              outputDimensionality: 768,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const vector: number[] = data.embedding?.values;
          if (Array.isArray(vector) && vector.length === 768) {
            this.cache.set(cleanText, vector);
            return vector;
          }
        }
      } catch (err) {
        console.warn('Google Embedding API request failed, using local semantic hash:', err);
      }
    }

    // Offline / Local Deterministic Vectorizer Fallback (768 dimensions)
    const fallbackVector = this.generateLocalSemanticVector(cleanText, 768);
    this.cache.set(cleanText, fallbackVector);
    return fallbackVector;
  }

  /**
   * Fast, zero-network deterministic semantic n-gram hash vectorizer.
   * Produces a normalized 768-dim float vector for local similarity comparison.
   */
  private static generateLocalSemanticVector(text: string, dimensions: number): number[] {
    const vec = new Array(dimensions).fill(0);
    const tokens = text.toLowerCase().split(/\s+/);

    for (const token of tokens) {
      if (!token) continue;
      // Character 3-grams
      for (let i = 0; i < token.length - 2; i++) {
        const gram = token.slice(i, i + 3);
        let hash = 0;
        for (let j = 0; j < gram.length; j++) {
          hash = (hash << 5) - hash + gram.charCodeAt(j);
          hash |= 0;
        }
        const idx = Math.abs(hash) % dimensions;
        vec[idx] += 1;
      }
    }

    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < dimensions; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < dimensions; i++) {
        vec[i] = vec[i] / norm;
      }
    }

    return vec;
  }
}
