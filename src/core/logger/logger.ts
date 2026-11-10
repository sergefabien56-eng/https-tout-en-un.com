/**
 * Journalisation structurée (JSON) avec rédaction automatique des secrets.
 * Règle R4 : aucun jeton, mot de passe ou cookie ne doit jamais apparaître dans un journal.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const SENSITIVE_KEY =
  /(token|secret|password|passwd|authorization|cookie|api[-_]?key|private[-_]?key|credential|totp|recovery)/i;

const REDACTED = '[redacted]';

export type LogSink = (line: string) => void;

export interface LoggerContext {
  readonly requestId?: string;
  readonly shopId?: string | number;
  readonly userId?: string;
  readonly [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: LoggerContext): void;
  info(message: string, context?: LoggerContext): void;
  warn(message: string, context?: LoggerContext): void;
  error(message: string, context?: LoggerContext): void;
  child(context: LoggerContext): Logger;
}

export interface LoggerOptions {
  readonly level?: LogLevel;
  readonly sink?: LogSink;
  readonly base?: LoggerContext;
  readonly now?: () => Date;
}

/** Rédaction récursive : clés sensibles, jetons JWT ressemblants, objets Error. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[profondeur-max]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return scrubText(value);
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return { name: value.name, message: scrubText(value.message), stack: scrubText(value.stack ?? '') };
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1);
    }
    return output;
  }
  return String(value);
}

function looksLikeJwt(value: string): boolean {
  return /^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

/**
 * Une clé sensible collée dans du texte libre (« token=… », « password: … ») fuit aussi vite
 * qu'un champ structuré : on la rédige dans les chaînes, y compris les piles d'erreurs.
 */
const SENSITIVE_IN_TEXT =
  /\b(token|secret|password|passwd|authorization|api[_-]?key|refresh_token|client_secret|bearer)\b(\s*[=:]\s*)("[^"]*"|'[^']*'|\S+)/gi;

function scrubText(value: string): string {
  if (looksLikeJwt(value)) return REDACTED;
  return value.replace(SENSITIVE_IN_TEXT, (_match, key: string, separator: string) => `${key}${separator}${REDACTED}`);
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const threshold = LEVEL_WEIGHT[options.level ?? 'info'];
  const sink: LogSink = options.sink ?? ((line) => process.stdout.write(`${line}\n`));
  const now = options.now ?? (() => new Date());
  const base = options.base ?? {};

  const emit = (level: LogLevel, message: string, context: LoggerContext = {}): void => {
    if (LEVEL_WEIGHT[level] < threshold) return;
    const payload = {
      time: now().toISOString(),
      level,
      message: scrubText(message),
      ...(redact({ ...base, ...context }) as Record<string, unknown>),
    };
    try {
      sink(JSON.stringify(payload));
    } catch {
      sink(JSON.stringify({ time: payload.time, level: 'error', message: 'journalisation impossible' }));
    }
  };

  return {
    debug: (message, context) => emit('debug', message, context),
    info: (message, context) => emit('info', message, context),
    warn: (message, context) => emit('warn', message, context),
    error: (message, context) => emit('error', message, context),
    child: (context) => createLogger({ ...options, base: { ...base, ...context } }),
  };
}
