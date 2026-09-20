import { DailyLogRepository } from '@/data/repositories';
import { DailyLog } from '@/types';
import { CloudSyncResult } from './syncTypes';

export class SyncService {
  private static supabaseUrl: string | null = null;
  private static supabaseAnonKey: string | null = null;

  public static configure(url: string, anonKey: string) {
    this.supabaseUrl = url;
    this.supabaseAnonKey = anonKey;
  }

  public static isConfigured(): boolean {
    return !!(this.supabaseUrl && this.supabaseAnonKey);
  }

  public static async syncToCloud(): Promise<CloudSyncResult> {
    const localLogs = await DailyLogRepository.getAllLogs();

    if (!this.isConfigured()) {
      return {
        success: true,
        totalSynced: 0,
        message: 'Modo 100% Offline activo. Para sincronizar con Supabase, configure las credenciales.',
      };
    }

    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/daily_logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseAnonKey!,
          'Authorization': `Bearer ${this.supabaseAnonKey!}`,
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(
          localLogs.map((log: DailyLog) => ({
            date: log.date,
            calories_consumed: log.calories_consumed,
            target_calories: log.target_calories,
            notes: log.notes,
            updated_at: log.updated_at,
          }))
        ),
      });

      if (!response.ok) {
        throw new Error(`Supabase error ${response.status}: ${await response.text()}`);
      }

      return {
        success: true,
        totalSynced: localLogs.length,
        message: `Sincronización exitosa: ${localLogs.length} días actualizados en Supabase.`,
      };
    } catch (err: any) {
      return {
        success: false,
        totalSynced: 0,
        message: `Error al sincronizar con Supabase: ${err?.message || err}`,
      };
    }
  }
}
