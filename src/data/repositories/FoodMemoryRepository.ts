import { getDatabase } from '../local/db';

export interface UserFoodMemory {
  id: number;
  meal_text: string;
  normalized_title: string;
  breakdown_json: string;
  total_calories: number;
  embedding: string | null; // JSON stringified float array
  times_eaten: number;
  last_eaten_at: string;
  user_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemoryMatchResult {
  memory: UserFoodMemory;
  similarity: number;
}

export class FoodMemoryRepository {
  /**
   * Saves a new food memory or updates an existing one (incrementing frequency and updating audit timestamps).
   */
  static async saveOrUpdateMemory(
    mealText: string,
    breakdown: any[],
    totalCalories: number,
    embedding?: number[],
    userNotes?: string
  ): Promise<UserFoodMemory> {
    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    const normalized = mealText.trim().toLowerCase();

    // Check if exact normalized title already exists
    const existing = await db.getFirstAsync<UserFoodMemory>(
      'SELECT * FROM user_food_memories WHERE normalized_title = ?;',
      normalized
    );

    const breakdownJson = JSON.stringify(breakdown);
    const embeddingJson = embedding && embedding.length > 0 ? JSON.stringify(embedding) : null;

    if (existing) {
      const times = (existing.times_eaten || 1) + 1;
      await db.runAsync(
        `UPDATE user_food_memories
         SET times_eaten = ?,
             breakdown_json = ?,
             total_calories = ?,
             embedding = COALESCE(?, embedding),
             last_eaten_at = ?,
             user_notes = COALESCE(?, user_notes),
             updated_at = ?
         WHERE id = ?;`,
        times,
        breakdownJson,
        totalCalories,
        embeddingJson,
        nowIso,
        userNotes || null,
        nowIso,
        existing.id
      );

      return {
        ...existing,
        times_eaten: times,
        breakdown_json: breakdownJson,
        total_calories: totalCalories,
        embedding: embeddingJson || existing.embedding,
        last_eaten_at: nowIso,
        user_notes: userNotes || existing.user_notes,
        updated_at: nowIso,
      };
    } else {
      const res = await db.runAsync(
        `INSERT INTO user_food_memories (
           meal_text, normalized_title, breakdown_json, total_calories,
           embedding, times_eaten, last_eaten_at, user_notes, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        mealText.trim(),
        normalized,
        breakdownJson,
        totalCalories,
        embeddingJson,
        1,
        nowIso,
        userNotes || null,
        nowIso,
        nowIso
      );

      return {
        id: res.lastInsertRowId,
        meal_text: mealText.trim(),
        normalized_title: normalized,
        breakdown_json: breakdownJson,
        total_calories: totalCalories,
        embedding: embeddingJson,
        times_eaten: 1,
        last_eaten_at: nowIso,
        user_notes: userNotes || null,
        created_at: nowIso,
        updated_at: nowIso,
      };
    }
  }

  /**
   * Retrieves all logged food memories ordered by frequency.
   */
  static async getAllMemories(limit: number = 100): Promise<UserFoodMemory[]> {
    const db = await getDatabase();
    return await db.getAllAsync<UserFoodMemory>(
      'SELECT * FROM user_food_memories ORDER BY times_eaten DESC, last_eaten_at DESC LIMIT ?;',
      limit
    );
  }

  /**
   * Performs vector semantic retrieval (Cosine Similarity) across saved memories.
   */
  static async findSimilarMemories(
    queryEmbedding: number[],
    topK: number = 3,
    minSimilarity: number = 0.72
  ): Promise<MemoryMatchResult[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<UserFoodMemory>(
      'SELECT * FROM user_food_memories WHERE embedding IS NOT NULL;'
    );

    const matches: MemoryMatchResult[] = [];

    for (const row of rows) {
      if (!row.embedding) continue;
      try {
        const storedVector: number[] = JSON.parse(row.embedding);
        if (Array.isArray(storedVector) && storedVector.length === queryEmbedding.length) {
          const sim = this.cosineSimilarity(queryEmbedding, storedVector);
          if (sim >= minSimilarity) {
            matches.push({ memory: row, similarity: sim });
          }
        }
      } catch {
        // Skip malformed row
      }
    }

    // Sort by highest similarity first
    matches.sort((a, b) => b.similarity - a.similarity);
    return matches.slice(0, topK);
  }

  /**
   * Fast lexical/fuzzy lookup for common Argentine recurring food references.
   */
  static async findLexicalMatch(queryText: string): Promise<UserFoodMemory | null> {
    const db = await getDatabase();
    const normalized = queryText.trim().toLowerCase();

    // Direct match
    const direct = await db.getFirstAsync<UserFoodMemory>(
      'SELECT * FROM user_food_memories WHERE normalized_title = ? LIMIT 1;',
      normalized
    );
    if (direct) return direct;

    // Substring match
    return await db.getFirstAsync<UserFoodMemory>(
      'SELECT * FROM user_food_memories WHERE ? LIKE ("%" || normalized_title || "%") OR normalized_title LIKE ("%" || ? || "%") ORDER BY times_eaten DESC LIMIT 1;',
      normalized,
      normalized
    );
  }

  /**
   * Calculates cosine similarity between two float vectors.
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    const len = a.length;

    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return dot / denominator;
  }
}
