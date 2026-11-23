import * as SQLite from 'expo-sqlite';
import { DownloadStatus, Lesson } from '../../../domain/entities/Lesson';

interface LessonRow {
  id: string;
  title: string;
  subject: string;
  summary_text: string;
  remote_media_url: string;
  local_media_uri: string | null;
  media_size_bytes: number;
  download_status: DownloadStatus;
  updated_at: number;
}

export class LessonLocalDataSource {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async getAll(): Promise<Lesson[]> {
    const rows = await this.db.getAllAsync<LessonRow>(
      'SELECT * FROM lessons ORDER BY updated_at DESC;'
    );
    return rows.map(this.mapRowToEntity);
  }

  async getById(id: string): Promise<Lesson | null> {
    const row = await this.db.getFirstAsync<LessonRow>(
      'SELECT * FROM lessons WHERE id = ?;',
      [id]
    );
    return row ? this.mapRowToEntity(row) : null;
  }

  async upsertMany(lessons: Lesson[]): Promise<void> {
    if (lessons.length === 0) return;

    await this.db.withTransactionAsync(async () => {
      for (const lesson of lessons) {
        await this.db.runAsync(
          `INSERT INTO lessons (
            id, title, subject, summary_text, remote_media_url,
            local_media_uri, media_size_bytes, download_status, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            subject = excluded.subject,
            summary_text = excluded.summary_text,
            remote_media_url = excluded.remote_media_url,
            media_size_bytes = excluded.media_size_bytes,
            updated_at = excluded.updated_at;`,
          [
            lesson.id,
            lesson.title,
            lesson.subject,
            lesson.summaryText,
            lesson.remoteMediaUrl,
            lesson.localMediaUri,
            lesson.mediaSizeBytes,
            lesson.downloadStatus,
            lesson.updatedAt,
          ]
        );
      }
    });
  }

  async updateMediaStatus(
    lessonId: string,
    localUri: string | null,
    status: DownloadStatus
  ): Promise<void> {
    await this.db.runAsync(
      `UPDATE lessons
       SET local_media_uri = ?, download_status = ?
       WHERE id = ?;`,
      [localUri, status, lessonId]
    );
  }

  private mapRowToEntity(row: LessonRow): Lesson {
    return {
      id: row.id,
      title: row.title,
      subject: row.subject,
      summaryText: row.summary_text,
      remoteMediaUrl: row.remote_media_url,
      localMediaUri: row.local_media_uri,
      mediaSizeBytes: row.media_size_bytes,
      downloadStatus: row.download_status,
      updatedAt: row.updated_at,
    };
  }
}