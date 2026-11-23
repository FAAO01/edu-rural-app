export interface StudentProgress {
  id: string;
  studentId: string;
  lessonId: string;
  score: number;
  completedAt: number;
  synced: boolean; // false mientras espera conexión 2G/3G estable
}

export interface SyncQueueItem {
  id: string;
  entityType: 'PROGRESS';
  payloadJson: string;
  retryCount: number;
  createdAt: number;
}