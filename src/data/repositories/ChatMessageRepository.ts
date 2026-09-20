import { getDatabase } from '../local/db';
import { ChatMessage, MessageRole, MessageType, ProposalStatus } from '@/types';

export class ChatMessageRepository {
  /**
   * Returns recent messages in chronological order.
   */
  static async getRecentMessages(limit: number = 60): Promise<ChatMessage[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ChatMessage>(
      'SELECT * FROM chat_messages ORDER BY id DESC LIMIT ?;',
      limit
    );
    return rows.reverse();
  }

  /**
   * Adds a new chat message with audit timestamps.
   */
  static async addMessage(
    role: MessageRole,
    content: string,
    messageType: MessageType = 'text',
    payloadJson?: string,
    status: ProposalStatus = 'normal'
  ): Promise<ChatMessage> {
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    const res = await db.runAsync(
      `INSERT INTO chat_messages (role, content, message_type, payload_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      role,
      content,
      messageType,
      payloadJson || null,
      status,
      nowIso,
      nowIso
    );

    return {
      id: res.lastInsertRowId,
      role,
      content,
      message_type: messageType,
      payload_json: payloadJson,
      status,
      created_at: nowIso,
      updated_at: nowIso,
    };
  }

  /**
   * Updates status (e.g. 'pending' -> 'confirmed' or 'cancelled') and optionally updated payload.
   */
  static async updateStatus(
    id: number,
    status: ProposalStatus,
    payloadJson?: string
  ): Promise<void> {
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    if (payloadJson) {
      await db.runAsync(
        'UPDATE chat_messages SET status = ?, payload_json = ?, updated_at = ? WHERE id = ?;',
        status,
        payloadJson,
        nowIso,
        id
      );
    } else {
      await db.runAsync(
        'UPDATE chat_messages SET status = ?, updated_at = ? WHERE id = ?;',
        status,
        nowIso,
        id
      );
    }
  }

  /**
   * Clears chat history.
   */
  static async clearHistory(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM chat_messages;');
  }
}
