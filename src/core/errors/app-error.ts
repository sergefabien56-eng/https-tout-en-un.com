/**
 * Erreurs applicatives typées.
 * Règle : le message utilisateur est en français et ne contient JAMAIS de secret,
 * de jeton ni de détail technique exploitable.
 */
export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'UPSTREAM_REAUTH_REQUIRED'
  | 'INTERNAL';

const HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  UPSTREAM_REAUTH_REQUIRED: 409,
  INTERNAL: 500,
};

const RETRYABLE: ReadonlySet<ErrorCode> = new Set<ErrorCode>(['RATE_LIMITED', 'UPSTREAM_ERROR']);

export interface AppErrorOptions {
  /** Message affichable à l'utilisateur, en français. */
  readonly userMessage: string;
  /** Détail technique : journaux uniquement, jamais renvoyé au navigateur. */
  readonly technicalDetail?: string;
  readonly cause?: unknown;
  readonly context?: Record<string, unknown>;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly userMessage: string;
  readonly technicalDetail: string | undefined;
  readonly context: Record<string, unknown> | undefined;
  readonly retryable: boolean;

  constructor(code: ErrorCode, options: AppErrorOptions) {
    super(options.userMessage, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = HTTP_STATUS[code];
    this.userMessage = options.userMessage;
    this.technicalDetail = options.technicalDetail;
    this.context = options.context;
    this.retryable = RETRYABLE.has(code);
  }

  /** Représentation sûre pour les journaux : aucun message technique brut n'est exposé à l'UI. */
  toLogObject(): Record<string, unknown> {
    return {
      code: this.code,
      httpStatus: this.httpStatus,
      retryable: this.retryable,
      userMessage: this.userMessage,
      technicalDetail: this.technicalDetail,
      context: this.context,
    };
  }
}

export class ValidationError extends AppError {
  constructor(userMessage: string, technicalDetail?: string) {
    super('VALIDATION_FAILED', technicalDetail === undefined ? { userMessage } : { userMessage, technicalDetail });
    this.name = 'ValidationError';
  }
}

export class ForbiddenError extends AppError {
  constructor(userMessage = "Vous n'avez pas accès à cette boutique.", technicalDetail?: string) {
    super('FORBIDDEN', technicalDetail === undefined ? { userMessage } : { userMessage, technicalDetail });
    this.name = 'ForbiddenError';
  }
}

export class NotImplementedError extends AppError {
  constructor(feature: string) {
    super('INTERNAL', {
      userMessage: 'Cette fonctionnalité n’est pas encore disponible.',
      technicalDetail: `non implémenté : ${feature}`,
    });
    this.name = 'NotImplementedError';
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
