import type { ImageExtension } from '../../lib/storage.js';

/**
 * Identifica o formato real do arquivo pelos "magic bytes", sem confiar no
 * Content-Type nem na extensão enviados pelo cliente.
 */
export function detectImageType(buffer: Buffer): ImageExtension | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (pngSignature.every((byte, index) => buffer[index] === byte)) return 'png';

  // WEBP: "RIFF" .... "WEBP"
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';

  return null;
}
