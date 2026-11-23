import { StudentProgress, SyncQueueItem } from '../entities/StudentProgress';

export interface ISyncRepository {
  saveProgressLocally(progress: StudentProgress): Promise<void>;
  getPendingSyncItems(limit: number): Promise<SyncQueueItem[]>;
  markItemsAsSynced(itemIds: string[], progressIds: string[]): Promise<void>;
  incrementRetryCount(itemId: string): Promise<void>;
}