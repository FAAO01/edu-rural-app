export interface NetworkStatus {
  isConnected: boolean;
  isSlowOrMetered: boolean; // true en redes 2G/3G o datos limitados
}

export interface INetworkPort {
  getCurrentStatus(): Promise<NetworkStatus>;
  subscribe(listener: (status: NetworkStatus) => void): () => void;
}

export interface IMediaDownloaderPort {
  /**
   * Programa una descarga diferida verificando batería y calidad de red.
   */
  enqueueDeferredDownload(lessonId: string, remoteUrl: string): Promise<void>;
  pauseAllDownloads(): Promise<void>;
}

export interface ISecureKeyPort {
  /**
   * Obtiene o genera la llave maestra desde el almacenamiento seguro del hardware
   * para cifrar la base de datos local en reposo.
   */
  getOrCreateDatabaseKey(): Promise<string>;
}