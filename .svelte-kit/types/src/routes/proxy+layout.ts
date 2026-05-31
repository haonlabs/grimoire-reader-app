// @ts-nocheck
import type { LayoutLoad } from './$types';

export const load = async ({ fetch }: Parameters<LayoutLoad>[0]) => {
  try {
    const response = await fetch('/api/sources');
    return {
      sources: response.ok ? await response.json() : []
    };
  } catch {
    return { sources: [] };
  }
};
