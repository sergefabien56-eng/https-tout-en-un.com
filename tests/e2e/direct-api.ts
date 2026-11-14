import type { APIRequestContext } from '@playwright/test';

/**
 * Tests E2E seulement : évite de réutiliser un socket HTTP inactif par le client
 * API de Playwright. Ce n'est ni un retry ni un changement des requêtes navigateur.
 * Le contexte d'origine conserve cookies, en-têtes, corps et assertions.
 */
export function directApi(request: APIRequestContext) {
  function close<T extends { headers?: Record<string, string> }>(options?: T) {
    const headers = Object.fromEntries(Object.entries(options?.headers ?? {}).filter(([key]) => key.toLowerCase() !== 'connection'));
    return { ...options, headers: { ...headers, Connection: 'close' } };
  }
  return {
    get: (url: string, options?: Parameters<APIRequestContext['get']>[1]) => request.get(url, close(options)),
    post: (url: string, options?: Parameters<APIRequestContext['post']>[1]) => request.post(url, close(options)),
    put: (url: string, options?: Parameters<APIRequestContext['put']>[1]) => request.put(url, close(options)),
    patch: (url: string, options?: Parameters<APIRequestContext['patch']>[1]) => request.patch(url, close(options)),
    delete: (url: string, options?: Parameters<APIRequestContext['delete']>[1]) => request.delete(url, close(options)),
  };
}
