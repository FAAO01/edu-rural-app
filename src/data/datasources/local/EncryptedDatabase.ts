import * as SQLite from 'expo-sqlite';
import { ISecureKeyPort } from '../../../domain/ports/HardwarePorts';

export class EncryptedDatabase {
  private static instance: SQLite.SQLiteDatabase | null = null;
  private static initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

  static async getInstance(
    secureKeyPort: ISecureKeyPort
  ): Promise<SQLite.SQLiteDatabase> {
    if (this.instance) return this.instance;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initialize(secureKeyPort);
    this.instance = await this.initPromise;
    return this.instance;
  }

  private static async initialize(
    secureKeyPort: ISecureKeyPort
  ): Promise<SQLite.SQLiteDatabase> {
    const db = await SQLite.openDatabaseAsync('edurural_secure.db');
    const masterKey = await secureKeyPort.getOrCreateDatabaseKey();

    // Validación estricta para evitar inyección en PRAGMA
    if (!/^[0-9a-fA-F]{64}$/.test(masterKey)) {
      throw new Error('Llave de cifrado SQLCipher inválida.');
    }

    // 1. Aplicar cifrado en reposo (SQLCipher) antes de operar tablas
    await db.execAsync(`PRAGMA key = '${masterKey}';`);
    await db.execAsync(`PRAGMA journal_mode = WAL;`);

    // 2. Crear esquema persistente
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS lessons (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        subject TEXT NOT NULL,
        summary_text TEXT NOT NULL,
        remote_media_url TEXT NOT NULL,
        local_media_uri TEXT,
        media_size_bytes INTEGER NOT NULL DEFAULT 0,
        download_status TEXT NOT NULL DEFAULT 'NOT_DOWNLOADED',
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS student_progress (
        id TEXT PRIMARY KEY NOT NULL,
        student_id TEXT NOT NULL,
        lesson_id TEXT NOT NULL,
        score REAL NOT NULL,
        completed_at INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY NOT NULL,
        entity_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);

    await this.seedInitialLessonsIfEmpty(db);
    return db;
  }

  private static async seedInitialLessonsIfEmpty(
    db: SQLite.SQLiteDatabase
  ): Promise<void> {
    const row = await db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) as total FROM lessons;'
    );

    if (row && row.total > 0) return;

    const now = Date.now();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO lessons (
          id, title, subject, summary_text, remote_media_url,
          local_media_uri, media_size_bytes, download_status, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          'lec-mat-01',
          'Fracciones en la vida cotidiana',
          'Matemáticas - 4to Grado',
          'Una fracción representa las partes iguales en que dividimos una unidad, como repartir una manzana o medir terrenos de cultivo.',
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          null,
          1250000,
          'NOT_DOWNLOADED',
          now,
        ]
      );

      await db.runAsync(
        `INSERT INTO lessons (
          id, title, subject, summary_text, remote_media_url,
          local_media_uri, media_size_bytes, download_status, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          'lec-cie-01',
          'El ciclo del agua y los cultivos',
          'Ciencias Naturales - 4to Grado',
          'El agua circula continuamente entre los ríos, las nubes y la tierra mediante evaporación, condensación y precipitación.',
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
          null,
          1480000,
          'NOT_DOWNLOADED',
          now,
        ]
      );
    });
  }
}