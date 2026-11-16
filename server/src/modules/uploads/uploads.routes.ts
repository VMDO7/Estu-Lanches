import { Router } from 'express';
import { imageStorage } from '../../lib/storage.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { singleImageUpload } from '../../middlewares/upload.js';
import { AppError, badRequest } from '../../shared/errors.js';
import { detectImageType } from './image-signature.js';

export const uploadsRouter = Router();

uploadsRouter.post('/images', authenticate, authorize('ADMIN'), singleImageUpload, async (req, res) => {
  if (!req.file) {
    throw badRequest('Selecione uma imagem para enviar.', undefined, 'FILE_REQUIRED');
  }

  const extension = detectImageType(req.file.buffer);
  if (!extension) {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'O arquivo não é uma imagem JPG, PNG ou WEBP válida.');
  }

  const key = await imageStorage.save(req.file.buffer, extension);
  res.status(201).json({ data: { key, url: imageStorage.publicUrl(key) } });
});
