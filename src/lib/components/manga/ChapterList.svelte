<script lang="ts">
  import { CheckCircle2, Play } from 'lucide-svelte';
  import type { Chapter } from '$lib/sources/types';

  export let chapters: Chapter[] = [];
  export let mangaId: string;
  export let sourceId: string;
  export let readMap: Record<string, number> = {};
  export let sort: 'newest' | 'oldest' = 'newest';

  $: sorted = [...chapters].sort((a, b) =>
    sort === 'newest'
      ? Number(b.number) - Number(a.number)
      : Number(a.number) - Number(b.number)
  );
</script>

<div class="divide-y divide-ink/10 overflow-hidden rounded-lg border border-ink/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
  {#each sorted as chapter (chapter.id)}
    <a
      class="flex items-center justify-between gap-3 p-3 transition hover:bg-ink/5 dark:hover:bg-white/10"
      href={`/manga/${sourceId}/${mangaId}/${chapter.id}`}
    >
      <div class="min-w-0">
        <p class="font-medium text-ink dark:text-white">
          Chapter {chapter.number || '?'}{chapter.title ? `: ${chapter.title}` : ''}
        </p>
        <p class="mt-1 text-xs text-ink/55 dark:text-white/55">
          {chapter.language.toUpperCase()} · {chapter.scanlator ?? 'Unknown scanlator'} · {new Date(chapter.uploadedAt).toLocaleDateString()}
        </p>
      </div>
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white dark:bg-white dark:text-ink">
        {#if readMap[chapter.id] !== undefined}
          <CheckCircle2 size={18} />
        {:else}
          <Play size={17} />
        {/if}
      </div>
    </a>
  {/each}
</div>
