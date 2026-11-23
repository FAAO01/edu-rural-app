import { StudentProgress } from '../entities/StudentProgress';
import { ISyncRepository } from '../repositories/ISyncRepository';

export class RecordProgressUseCase {
  constructor(private readonly syncRepo: ISyncRepository) {}

  async execute(input: {
    id: string;
    studentId: string;
    lessonId: string;
    score: number;
  }): Promise<StudentProgress> {
    const progress: StudentProgress = {
      ...input,
      completedAt: Date.now(),
      synced: false,
    };

    // Persiste localmente y encola para sincronización diferencial futura
    await this.syncRepo.saveProgressLocally(progress);
    return progress;
  }
}