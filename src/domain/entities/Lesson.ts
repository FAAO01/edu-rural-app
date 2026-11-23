export type DownloadStatus =
  | 'NOT_DOWNLOADED'
  | 'QUEUED'
  | 'DOWNLOADING'
  | 'READY'
  | 'FAILED';

export interface Lesson {
  id: string;
  title: string;
  subject: string;
  summaryText: string;          // Disponible siempre offline
  remoteMediaUrl: string;       // URL del audio/video comprimido
  localMediaUri: string | null; // Ruta en la caché local persistente
  mediaSizeBytes: number;
  downloadStatus: DownloadStatus;
  updatedAt: number;
}