import { DownloadStatus, Lesson } from '../entities/Lesson';

export interface ILessonRepository {
  getLocalLessons(): Promise<Lesson[]>;
  getLessonById(id: string): Promise<Lesson | null>;
  saveLessonsToCache(lessons: Lesson[]): Promise<void>;
  updateMediaStatus(
    lessonId: string,
    localUri: string | null,
    status: DownloadStatus
  ): Promise<void>;
}