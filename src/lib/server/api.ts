import { json } from '@sveltejs/kit';
import { getSource } from '$lib/sources/registry';
import type { FilterInput } from '$lib/sources/types';

export function parsePage(url: URL) {
  return Math.max(1, Number(url.searchParams.get('page') ?? 1));
}

export function parseFilters(url: URL): FilterInput[] {
  const raw = url.searchParams.get('filters');
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export async function sourceJson<T>(handler: () => Promise<T>) {
  try {
    const result = await handler();
    return json(result, {
      headers: {
        'cache-control': 'public, max-age=120'
      }
    });
  } catch (error) {
    const status =
      typeof error === 'object' && error && 'status' in error && typeof error.status === 'number'
        ? error.status
        : 500;
    const retryAfter =
      typeof error === 'object' && error && 'retryAfter' in error ? Number(error.retryAfter) : undefined;
    const errorCode =
      typeof error === 'object' && error && 'code' in error && typeof error.code === 'string'
        ? error.code
        : status;

    return json(
      {
        error: error instanceof Error ? error.message : 'Unknown source error',
        code: errorCode,
        retryAfter
      },
      { status, headers: retryAfter ? { 'retry-after': String(retryAfter) } : undefined }
    );
  }
}

export function sourceFromParams(params: { sourceId: string }) {
  return getSource(params.sourceId);
}
