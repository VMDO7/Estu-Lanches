import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../shared/errors.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Upload de uma única imagem em memória. O tipo declarado é apenas um
 * primeiro filtro — a assinatura binária é verificada no serviço.
 * SVG não é aceito (pode conter scripts → XSS).
 */
export const singleImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    files: 1,
    fields: 0,
  },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(
      new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Formato não suportado. Envie uma imagem JPG, PNG ou WEBP.'),
    );
  },
}).single('image');
