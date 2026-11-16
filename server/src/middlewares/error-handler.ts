import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { ZodError, z } from 'zod';
import { env } from '../config/env.js';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../shared/errors.js';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export const notFoundHandler: RequestHandler = () => {
  throw new AppError(404, 'ROUTE_NOT_FOUND', 'Rota não encontrada.');
};

/** Erros lançados pelo body-parser do Express (JSON malformado, payload grande). */
function isBodyParserError(error: unknown): error is { type: string; status: number } {
  return typeof error === 'object' && error !== null && 'type' in error && 'status' in error;
}

/**
 * Tratamento centralizado: converte erros conhecidos em respostas
 * padronizadas e nunca expõe stack traces ou detalhes internos.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const send = (status: number, body: Omit<ErrorBody, 'requestId'>) => {
    res.status(status).json({ error: { ...body, requestId: String(req.id ?? '') } });
  };

  if (error instanceof AppError) {
    send(error.statusCode, {
      code: error.code,
      message: error.message,
      ...(error.details !== undefined && { details: error.details }),
    });
    return;
  }

  if (error instanceof ZodError) {
    send(400, {
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos. Verifique os campos informados.',
      details: z.flattenError(error),
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      send(413, {
        code: 'FILE_TOO_LARGE',
        message: `A imagem deve ter no máximo ${env.MAX_UPLOAD_SIZE_MB} MB.`,
      });
      return;
    }
    send(400, { code: 'UPLOAD_ERROR', message: 'Não foi possível processar o arquivo enviado.' });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      send(409, { code: 'DUPLICATE', message: 'Já existe um registro com esses dados.' });
      return;
    }
    if (error.code === 'P2025') {
      send(404, { code: 'NOT_FOUND', message: 'Recurso não encontrado.' });
      return;
    }
    if (error.code === 'P2003') {
      send(409, {
        code: 'RELATION_CONSTRAINT',
        message: 'Operação não permitida: existem registros vinculados.',
      });
      return;
    }
  }

  if (isBodyParserError(error)) {
    if (error.type === 'entity.parse.failed') {
      send(400, { code: 'INVALID_JSON', message: 'O corpo da requisição não é um JSON válido.' });
      return;
    }
    if (error.type === 'entity.too.large') {
      send(413, { code: 'PAYLOAD_TOO_LARGE', message: 'O corpo da requisição é grande demais.' });
      return;
    }
  }

  req.log.error({ err: error }, 'Erro não tratado');
  send(500, {
    code: 'INTERNAL_ERROR',
    message: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
  });
};
