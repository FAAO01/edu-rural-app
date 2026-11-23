import * as Battery from 'expo-battery';
import * as FileSystem from 'expo-file-system/legacy';
import { IMediaDownloaderPort, INetworkPort } from '../../domain/ports/HardwarePorts';
import { ILessonRepository } from '../../domain/repositories/ILessonRepository';

interface QueueEntry {
  lessonId: string;
  remoteUrl: string;
}

const MEDIA_DIR = `${FileSystem.documentDirectory}lessons_media/`;
const MIN_BATTERY_LEVEL = 0.2; // 20% mínimo si no está conectado a corriente

export class BatteryAwareMediaDownloader implements IMediaDownloaderPort {
  private queue: QueueEntry[] = [];
  private isProcessing = false;
  private activeDownload: FileSystem.DownloadResumable | null = null;

  constructor(
    private readonly lessonRepo: ILessonRepository,
    private readonly networkPort: INetworkPort
  ) {}

  async enqueueDeferredDownload(lessonId: string, remoteUrl: string): Promise<void> {
    const alreadyQueued = this.queue.some((item) => item.lessonId === lessonId);
    if (!alreadyQueued) {
      this.queue.push({ lessonId, remoteUrl });
      await this.lessonRepo.updateMediaStatus(lessonId, null, 'QUEUED');
    }

    // Inicia el procesamiento asíncrono controlado sin bloquear el hilo de UI
    void this.processNextInQueue();
  }

  async pauseAllDownloads(): Promise<void> {
    this.queue = [];
    if (this.activeDownload) {
      try {
        await this.activeDownload.pauseAsync();
      } catch {
        // Ignorar si ya había finalizado o perdido conexión
      } finally {
        this.activeDownload = null;
        this.isProcessing = false;
      }
    }
  }

  private async processNextInQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    // 1. Verificar restricciones de batería y red antes de consumir radio celular
    const canRun = await this.hasOptimalConditions();
    if (!canRun) {
      // Mantiene los elementos en estado QUEUED para reintentar luego
      return;
    }

    this.isProcessing = true;
    const current = this.queue.shift()!;

    try {
      await this.ensureMediaDirectory();
      await this.lessonRepo.updateMediaStatus(current.lessonId, null, 'DOWNLOADING');

      const extension = this.extractExtension(current.remoteUrl);
      const localTargetUri = `${MEDIA_DIR}${current.lessonId}.${extension}`;

      this.activeDownload = FileSystem.createDownloadResumable(
        current.remoteUrl,
        localTargetUri,
        {}
      );

      const result = await this.activeDownload.downloadAsync();

      if (result && result.status >= 200 && result.status < 300) {
        await this.lessonRepo.updateMediaStatus(current.lessonId, result.uri, 'READY');
      } else {
        await this.lessonRepo.updateMediaStatus(current.lessonId, null, 'FAILED');
      }
    } catch {
      // Ante caída de red 2G/3G, marcamos FAILED para reintentar cuando vuelva la señal
      await this.lessonRepo.updateMediaStatus(current.lessonId, null, 'FAILED');
    } finally {
      this.activeDownload = null;
      this.isProcessing = false;
      // Continuar secuencialmente con el siguiente archivo
      void this.processNextInQueue();
    }
  }

  private async hasOptimalConditions(): Promise<boolean> {
    const net = await this.networkPort.getCurrentStatus();
    if (!net.isConnected) return false;

    const [batteryLevel, batteryState] = await Promise.all([
      Battery.getBatteryLevelAsync(),
      Battery.getBatteryStateAsync(),
    ]);

    const isCharging =
      batteryState === Battery.BatteryState.CHARGING ||
      batteryState === Battery.BatteryState.FULL;

    // batteryLevel devuelve -1 en emuladores sin batería simulada
    if (batteryLevel >= 0 && batteryLevel < MIN_BATTERY_LEVEL && !isCharging) {
      return false;
    }

    return true;
  }

  private async ensureMediaDirectory(): Promise<void> {
    const info = await FileSystem.getInfoAsync(MEDIA_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
    }
  }

  private extractExtension(url: string): string {
    const cleanUrl = url.split('?')[0];
    const parts = cleanUrl.split('.');
    return parts.length > 1 ? parts.pop()! : 'mp4';
  }
}