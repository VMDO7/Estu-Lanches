/**
 * Erro de domínio/HTTP. Tudo que não for AppError é tratado como erro
 * inesperado (500) e nunca tem detalhes expostos ao cliente.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: unknown, code = 'BAD_REQUEST') =>
  new AppError(400, code, message, details);

export const unauthorized = (message = 'Autenticação necessária.', code = 'UNAUTHORIZED') =>
  new AppError(401, code, message);

export const forbidden = (message = 'Você não tem permissão para esta ação.') =>
  new AppError(403, 'FORBIDDEN', message);

export const notFound = (message = 'Recurso não encontrado.') =>
  new AppError(404, 'NOT_FOUND', message);

export const conflict = (message: string, details?: unknown, code = 'CONFLICT') =>
  new AppError(409, code, message, details);

export const unprocessable = (message: string, details?: unknown, code = 'UNPROCESSABLE') =>
  new AppError(422, code, message, details);
