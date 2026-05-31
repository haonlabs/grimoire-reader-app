// @ts-nocheck
import type { PageLoad } from './$types';

export const load = async ({ parent }: Parameters<PageLoad>[0]) => parent();
