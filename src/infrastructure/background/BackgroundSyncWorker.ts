import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

export const BACKGROUND_SYNC_TASK = 'EDURURAL_CONTROLLED_SYNC_TASK';

type SyncExecutor = () => Promise<boolean>;
let registeredExecutor: SyncExecutor | null = null;

// Definición global requerida por expo-task-manager
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    if (!registeredExecutor) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const hadWork = await registeredExecutor();
    return hadWork
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export class BackgroundSyncWorker {
  static async register(executor: SyncExecutor): Promise<void> {
    registeredExecutor = executor;

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // Mínimo 15 minutos para preservar batería
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  }
}