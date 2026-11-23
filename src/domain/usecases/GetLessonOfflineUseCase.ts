import { Lesson } from '../entities/Lesson';
import { IMediaDownloaderPort, INetworkPort } from '../ports/HardwarePorts';
import { ILessonRepository } from '../repositories/ILessonRepository';

export class GetLessonOfflineUseCase {
  constructor(
    private readonly lessonRepo: ILessonRepository,
    private readonly networkPort: INetworkPort,
    private readonly mediaDownloader: IMediaDownloaderPort
  ) {}

  async execute(lessonId: string): Promise<Lesson | null> {
    // 1. Prioridad absoluta a la caché local persistente (Offline-first)
    const lesson = await this.lessonRepo.getLessonById(lessonId);
    if (!lesson) return null;

    // 2. Si falta el multimedia, delega a descarga diferida si hay red
    const needsDownload =
      lesson.downloadStatus === 'NOT_DOWNLOADED' ||
      lesson.downloadStatus === 'FAILED';

    if (needsDownload) {
      const net = await this.networkPort.getCurrentStatus();
      if (net.isConnected) {
        await this.mediaDownloader.enqueueDeferredDownload(
          lesson.id,
          lesson.remoteMediaUrl
        );
      }
    }

    return lesson;
  }
}