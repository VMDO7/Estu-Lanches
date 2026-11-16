const DEFAULT_MESSAGES: Record<number, string> = {
  0: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
  400: 'Dados inválidos. Revise as informações.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para esta ação.',
  404: 'Não encontramos o que você procurava.',
  409: 'Esta ação conflita com o estado atual dos dados.',
  413: 'O arquivo enviado é grande demais.',
  429: 'Muitas tentativas em pouco tempo. Aguarde um instante.',
  500: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
};

export interface FieldErrors {
  [field: string]: string[] | undefined;
}

/** Erro padronizado retornado pela API ({ error: { code, message, details } }). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const fallback = DEFAULT_MESSAGES[response.status] ?? DEFAULT_MESSAGES[500]!;
    try {
      const body = (await response.json()) as {
        error?: { code?: string; message?: string; details?: unknown; requestId?: string };
      };
      return new ApiError(
        response.status,
        body.error?.code ?? 'HTTP_ERROR',
        body.error?.message ?? fallback,
        body.error?.details,
        body.error?.requestId,
      );
    } catch {
      return new ApiError(response.status, 'HTTP_ERROR', fallback);
    }
  }

  /** Erros por campo vindos da validação do backend. */
  get fieldErrors(): FieldErrors {
    const details = this.details as { fieldErrors?: FieldErrors } | undefined;
    return details?.fieldErrors ?? {};
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getErrorMessage(error: unknown, fallback = DEFAULT_MESSAGES[500]!): string {
  if (isApiError(error)) return error.message;
  return fallback;
}
