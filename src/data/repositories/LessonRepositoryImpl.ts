import { DownloadStatus, Lesson } from '../../domain/entities/Lesson';
import { INetworkPort } from '../../domain/ports/HardwarePorts';
import { ILessonRepository } from '../../domain/repositories/ILessonRepository';
import { LessonLocalDataSource } from '../datasources/local/LessonLocalDataSource';
import { LessonRemoteDataSource } from '../datasources/remote/LessonRemoteDataSource';

export class LessonRepositoryImpl implements ILessonRepository {
  constructor(
    private readonly localDS: LessonLocalDataSource,
    private readonly remoteDS: LessonRemoteDataSource,
    private readonly networkPort: INetworkPort
  ) {}

  async getLocalLessons(): Promise<Lesson[]> {
    return this.localDS.getAll();
  }

  async getLessonById(id: string): Promise<Lesson | null> {
    return this.localDS.getById(id);
  }

  async saveLessonsToCache(lessons: Lesson[]): Promise<void> {
    await this.localDS.upsertMany(lessons);
  }

  async updateMediaStatus(
    lessonId: string,
    localUri: string | null,
    status: DownloadStatus
  ): Promise<void> {
    await this.localDS.updateMediaStatus(lessonId, localUri, status);
  }

  /**
   * Sincronización diferencial de catálogo (solo metadatos ligeros).
   */
  async syncCatalogDelta(): Promise<boolean> {
    const net = await this.networkPort.getCurrentStatus();
    if (!net.isConnected) return false;

    const currentLessons = await this.localDS.getAll();
    const lastUpdated = currentLessons.reduce(
      (max, item) => Math.max(max, item.updatedAt),
      0
    );

    const deltas = await this.remoteDS.fetchUpdatedLessons(lastUpdated);
    if (deltas.length > 0) {
      await this.localDS.upsertMany(deltas);
      return true;
    }
    return false;
  }
}