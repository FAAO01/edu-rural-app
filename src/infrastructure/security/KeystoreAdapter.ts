import * as SecureStore from 'expo-secure-store';
import { ISecureKeyPort } from '../../domain/ports/HardwarePorts';

const DB_KEY_ALIAS = 'edurural_sqlcipher_master_key_v1';

export class KeystoreAdapter implements ISecureKeyPort {
  async getOrCreateDatabaseKey(): Promise<string> {
    // 1. Intentar recuperar la llave existente desde el enclave seguro del dispositivo
    const existingKey = await SecureStore.getItemAsync(DB_KEY_ALIAS, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    if (existingKey) {
      return existingKey;
    }

    // 2. Generar una llave aleatoria de 256 bits (64 caracteres hexadecimales)
    const newKey = this.generateRandomHexKey(32);

    // 3. Guardar cifrada por hardware sin permitir respaldo en la nube
    await SecureStore.setItemAsync(DB_KEY_ALIAS, newKey, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    return newKey;
  }

  private generateRandomHexKey(byteLength: number): string {
    const bytes = new Uint8Array(byteLength);
    if (globalThis.crypto && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < byteLength; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}