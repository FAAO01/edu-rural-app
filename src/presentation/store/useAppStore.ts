import { create } from 'zustand';
import { AppContainer, initializeContainer } from '../../di/container';
import { Lesson } from '../../domain/entities/Lesson';
import { NetworkStatus } from '../../domain/ports/HardwarePorts';

interface AppState {
  isReady: boolean;
  container: AppContainer | null;
  lessons: Lesson[];
  selectedLesson: Lesson | null;
  networkStatus: NetworkStatus;
  lastSyncMessage: string | null;

  bootstrap: () => Promise<void>;
  refreshLessons: () => Promise<void>;
  openLesson: (lessonId: string) => Promise<void>;
  closeLesson: () => void;
  submitLessonCompletion: (studentId: string, lessonId: string, score: number) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  isReady: false,
  container: null,
  lessons: [],
  selectedLesson: null,
  networkStatus: { isConnected: false, isSlowOrMetered: true },
  lastSyncMessage: null,

  bootstrap: async () => {
    const container = await initializeContainer();
    const initialNet = await container.networkPort.getCurrentStatus();
    const lessons = await container.lessonRepository.getLocalLessons();

    container.networkPort.subscribe((status) => {
      set({ networkStatus: status });
    });

    set({
      isReady: true,
      container,
      lessons,
      networkStatus: initialNet,
    });
  },

  refreshLessons: async () => {
    const { container } = get();
    if (!container) return;
    const lessons = await container.lessonRepository.getLocalLessons();
    set({ lessons });
  },

  openLesson: async (lessonId: string) => {
    const { container } = get();
    if (!container) return;

    // Ejecuta el caso de uso offline-first y encola descarga diferida si aplica
    const lesson = await container.getLessonOfflineUseCase.execute(lessonId);
    const updatedLessons = await container.lessonRepository.getLocalLessons();

    set({
      selectedLesson: lesson,
      lessons: updatedLessons,
    });
  },

  closeLesson: () => {
    set({ selectedLesson: null });
    void get().refreshLessons();
  },

  submitLessonCompletion: async (studentId: string, lessonId: string, score: number) => {
    const { container } = get();
    if (!container) return;

    await container.recordProgressUseCase.execute({
      id: `prog_${Date.now()}`,
      studentId,
      lessonId,
      score,
    });

    // Intenta enviar inmediatamente si hay red; si no, queda cifrado en cola local
    const syncedNow = await container.syncRepository.flushPendingQueue();
    set({
      lastSyncMessage: syncedNow
        ? 'Progreso guardado y sincronizado con la escuela.'
        : 'Sin red: progreso cifrado localmente. Se enviará al detectar señal.',
    });
  },
}));
