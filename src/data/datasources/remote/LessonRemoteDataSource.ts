import { Lesson } from '../../../domain/entities/Lesson';
import { SyncQueueItem } from '../../../domain/entities/StudentProgress';

const REQUEST_TIMEOUT_MS = 10000; // 10s máximo para redes 2G/3G lentas

export class LessonRemoteDataSource {
  constructor(private readonly baseUrl: string) {}

  async fetchUpdatedLessons(sinceTimestamp: number): Promise<Lesson[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${this.baseUrl}/lessons?since=${sinceTimestamp}`,
        { signal: controller.signal }
      );
      if (!response.ok) return [];
      return (await response.json()) as Lesson[];
    } catch {
      // Fallo silencioso ante pérdida de señal 2G/3G
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  async uploadProgressBatch(items: SyncQueueItem[]): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}/sync/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch: items.map((item) => JSON.parse(item.payloadJson)),
        }),
        signal: controller.signal,
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}