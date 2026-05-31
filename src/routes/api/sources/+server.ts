import { json } from '@sveltejs/kit';
import { SOURCE_METADATA } from '$lib/sources/metadata';
import { SOURCE_REGISTRY } from '$lib/sources/registry';

export async function GET() {
  const health = await Promise.all(
    Object.values(SOURCE_REGISTRY).map(async (source) => ({
      id: source.id,
      health: source.getHealth ? await source.getHealth() : { status: 'online' as const }
    }))
  );
  const healthMap = Object.fromEntries(health.map((entry) => [entry.id, entry.health]));

  return json(
    SOURCE_METADATA.map((source) => ({
      ...source,
      health: healthMap[source.id] ?? { status: 'offline' }
    })),
    {
      headers: {
        'cache-control': 'public, max-age=300'
      }
    }
  );
}
