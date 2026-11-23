import * as SQLite from 'expo-sqlite';
import { StudentProgress, SyncQueueItem } from '../../domain/entities/StudentProgress';
import { INetworkPort } from '../../domain/ports/HardwarePorts';
import { ISyncRepository } from '../../domain/repositories/ISyncRepository';
import { LessonRemoteDataSource } from '../datasources/remote/LessonRemoteDataSource';

const MAX_RETRIES = 5;
const BATCH_SIZE = 10;

export class SyncRepositoryImpl implements ISyncRepository {
  constructor(
    private readonly db: SQLite.SQLiteDatabase,
    private readonly remoteDS: LessonRemoteDataSource,
    private readonly networkPort: INetworkPort
  ) {}

  async saveProgressLocally(progress: StudentProgress): Promise<void> {
    const queueId = `sync_${progress.id}`;
    const payloadJson = JSON.stringify(progress);

    // Transacción atómica: evita pérdida de datos si se apaga el teléfono
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO student_progress (
          id, student_id, lesson_id, score, completed_at, synced
        ) VALUES (?, ?, ?, ?, ?, 0);`,
        [
          progress.id,
          progress.studentId,
          progress.lessonId,
          progress.score,
          progress.completedAt,
        ]
      );

      await this.db.runAsync(
        `INSERT OR REPLACE INTO sync_queue (
          id, entity_type, payload_json, retry_count, created_at
        ) VALUES (?, 'PROGRESS', ?, 0, ?);`,
        [queueId, payloadJson, Date.now()]
      );
    });
  }

  async getPendingSyncItems(limit: number): Promise<SyncQueueItem[]> {
    const rows = await this.db.getAllAsync<{
      id: string;
      entity_type: 'PROGRESS';
      payload_json: string;
      retry_count: number;
      created_at: number;
    }>(
      `SELECT * FROM sync_queue
       WHERE retry_count < ?
       ORDER BY created_at ASC
       LIMIT ?;`,
      [MAX_RETRIES, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      entityType: r.entity_type,
      payloadJson: r.payload_json,
      retryCount: r.retry_count,
      createdAt: r.created_at,
    }));
  }

  async markItemsAsSynced(
    itemIds: string[],
    progressIds: string[]
  ): Promise<void> {
    if (itemIds.length === 0) return;

    await this.db.withTransactionAsync(async () => {
      for (const id of itemIds) {
        await this.db.runAsync('DELETE FROM sync_queue WHERE id = ?;', [id]);
      }
      for (const pid of progressIds) {
        await this.db.runAsync(
          'UPDATE student_progress SET synced = 1 WHERE id = ?;',
          [pid]
        );
      }
    });
  }

  async incrementRetryCount(itemId: string): Promise<void> {
    await this.db.runAsync(
      'UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?;',
      [itemId]
    );
  }

  /**
   * Ejecuta un ciclo de sincronización diferencial por lotes pequeños.
   */
  async flushPendingQueue(): Promise<boolean> {
    const net = await this.networkPort.getCurrentStatus();
    if (!net.isConnected) return false;

    const pending = await this.getPendingSyncItems(BATCH_SIZE);
    if (pending.length === 0) return false;

    const uploaded = await this.remoteDS.uploadProgressBatch(pending);
    if (uploaded) {
      const itemIds = pending.map((i) => i.id);
      const progressIds = pending.map(
        (i) => (JSON.parse(i.payloadJson) as StudentProgress).id
      );
      await this.markItemsAsSynced(itemIds, progressIds);
      return true;
    }

    for (const item of pending) {
      await this.incrementRetryCount(item.id);
    }
    return false;
  }
}