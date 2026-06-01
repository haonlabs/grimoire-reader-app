<script lang="ts">
  import { CheckCircle2, Play } from 'lucide-svelte';
  import type { Chapter } from '$lib/sources/types';
  import { proxiedImageUrl } from '$lib/utils/image';

  export let chapters: Chapter[] = [];
  export let mangaId: string;
  export let sourceId: string;
  export let readMap: Record<string, number> = {};
  export let sort: 'newest' | 'oldest' = 'newest';
  export let coverUrl = '';

  $: sorted = [...chapters].sort((a, b) =>
    sort === 'newest'
      ? Number(b.number) - Number(a.number)
      : Number(a.number) - Number(b.number)
  );

  function relativeDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
    if (days === 0) return 'hari ini';
    if (days === 1) return '1 hari lalu';
    if (days < 30) return `${days} hari lalu`;
    return date.toLocaleDateString('id-ID');
  }
</script>

<div class="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-[#101012]">
  {#each sorted as chapter (chapter.id)}
    <a
      class="flex items-center gap-3 p-3 transition hover:bg-white/10"
      href={`/manga/${sourceId}/${mangaId}/${chapter.id}`}
    >
      <div class="h-16 w-12 shrink-0 overflow-hidden rounded-md bg-white/10">
        {#if chapter.thumbnailUrl || coverUrl}
          <img class="h-full w-full object-cover" src={proxiedImageUrl(chapter.thumbnailUrl || coverUrl)} alt="" loading="lazy" />
        {:else}
          <div class="h-full w-full shimmer bg-white/10"></div>
        {/if}
      </div>
      <div class="min-w-0 flex-1">
        <p class="font-semibold text-white">
          Chapter {chapter.number || '?'}
        </p>
        {#if chapter.title}
          <p class="mt-0.5 line-clamp-1 text-sm text-white/70">{chapter.title}</p>
        {/if}
        <p class="mt-1 text-xs text-white/55">
          {chapter.language.toUpperCase()} · {chapter.scanlator ?? 'Shinigami'} · {relativeDate(chapter.uploadedAt)}
        </p>
      </div>
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-white">
        {#if readMap[chapter.id] !== undefined}
          <CheckCircle2 size={18} />
        {:else}
          <Play size={17} />
        {/if}
      </div>
    </a>
  {/each}
</div>
