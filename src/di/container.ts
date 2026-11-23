import { EncryptedDatabase } from '../data/datasources/local/EncryptedDatabase';
import { LessonLocalDataSource } from '../data/datasources/local/LessonLocalDataSource';
import { LessonRemoteDataSource } from '../data/datasources/remote/LessonRemoteDataSource';
import { LessonRepositoryImpl } from '../data/repositories/LessonRepositoryImpl';
import { SyncRepositoryImpl } from '../data/repositories/SyncRepositoryImpl';
import { GetLessonOfflineUseCase } from '../domain/usecases/GetLessonOfflineUseCase';
import { RecordProgressUseCase } from '../domain/usecases/RecordProgressUseCase';
import { BackgroundSyncWorker } from '../infrastructure/background/BackgroundSyncWorker';
import { BatteryAwareMediaDownloader } from '../infrastructure/media/BatteryAwareMediaDownloader';
import { NetInfoAdapter } from '../infrastructure/network/NetInfoAdapter';
import { KeystoreAdapter } from '../infrastructure/security/KeystoreAdapter';

const API_BASE_URL = 'https://api.edurural-nicaragua.example.org/v1';

export interface AppContainer {
  networkPort: NetInfoAdapter;
  lessonRepository: LessonRepositoryImpl;
  syncRepository: SyncRepositoryImpl;
  mediaDownloader: BatteryAwareMediaDownloader;
  getLessonOfflineUseCase: GetLessonOfflineUseCase;
  recordProgressUseCase: RecordProgressUseCase;
}

let containerInstance: AppContainer | null = null;

export async function initializeContainer(): Promise<AppContainer> {
  if (containerInstance) return containerInstance;

  // 1. Infraestructura base (Seguridad y Red)
  const keystoreAdapter = new KeystoreAdapter();
  const networkPort = new NetInfoAdapter();

  // 2. Base de datos SQLite con cifrado en reposo (SQLCipher)
  const db = await EncryptedDatabase.getInstance(keystoreAdapter);

  // 3. Fuentes de datos y repositorios
  const localDS = new LessonLocalDataSource(db);
  const remoteDS = new LessonRemoteDataSource(API_BASE_URL);
  const lessonRepository = new LessonRepositoryImpl(localDS, remoteDS, networkPort);
  const syncRepository = new SyncRepositoryImpl(db, remoteDS, networkPort);

  // 4. Descargador diferido consciente de batería
  const mediaDownloader = new BatteryAwareMediaDownloader(lessonRepository, networkPort);

  // 5. Casos de uso del dominio
  const getLessonOfflineUseCase = new GetLessonOfflineUseCase(
    lessonRepository,
    networkPort,
    mediaDownloader
  );
  const recordProgressUseCase = new RecordProgressUseCase(syncRepository);

  // 6. Función unificada de sincronización controlada
  const runControlledSync = async (): Promise<boolean> => {
    const progressSynced = await syncRepository.flushPendingQueue();
    const catalogUpdated = await lessonRepository.syncCatalogDelta();
    return progressSynced || catalogUpdated;
  };

  // Registrar tarea periódica en segundo plano
  await BackgroundSyncWorker.register(runControlledSync);

  // Reaccionar automáticamente cuando vuelva la conectividad 2G/3G
  networkPort.subscribe((status: { isConnected: boolean }) => {
    if (status.isConnected) {
      void runControlledSync();
    } else {
      void mediaDownloader.pauseAllDownloads();
    }
  });

  containerInstance = {
    networkPort,
    lessonRepository,
    syncRepository,
    mediaDownloader,
    getLessonOfflineUseCase,
    recordProgressUseCase,
  };

  return containerInstance;
}