import { randomUUID } from 'node:crypto';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export type ImageExtension = 'jpg' | 'png' | 'webp';

/** Formato das chaves geradas pelo storage (UUID + extensão permitida). */
export const IMAGE_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

/**
 * Abstração de armazenamento de imagens. A implementação local serve para
 * desenvolvimento e instância única; em produção com várias instâncias,
 * troque por um storage de objetos (S3, R2, GCS) atrás de uma CDN —
 * o restante da aplicação não muda.
 */
export interface ImageStorage {
  save(content: Buffer, extension: ImageExtension): Promise<string>;
  remove(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  publicUrl(key: string): string;
}

class LocalDiskImageStorage implements ImageStorage {
  constructor(
    private readonly directory: string,
    private readonly baseUrl: string,
  ) {}

  async save(content: Buffer, extension: ImageExtension): Promise<string> {
    await mkdir(this.directory, { recursive: true });
    const key = `${randomUUID()}.${extension}`;
    await writeFile(this.resolve(key), content, { flag: 'wx' });
    return key;
  }

  async remove(key: string): Promise<void> {
    if (!IMAGE_KEY_PATTERN.test(key)) return;
    try {
      await unlink(this.resolve(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn({ err: error, key }, 'Falha ao remover imagem');
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!IMAGE_KEY_PATTERN.test(key)) return false;
    try {
      await access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  publicUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }

  /** A chave já foi validada pelo padrão — sem risco de path traversal. */
  private resolve(key: string): string {
    return path.join(this.directory, key);
  }
}

export const uploadsDirectory = path.resolve(env.UPLOADS_DIR);

export const imageStorage: ImageStorage = new LocalDiskImageStorage(
  uploadsDirectory,
  env.PUBLIC_UPLOADS_URL,
);

export function imageUrlFor(key: string | null): string | null {
  return key ? imageStorage.publicUrl(key) : null;
}
