<script lang="ts">
  import { RotateCcw } from 'lucide-svelte';
  import ChapterList from '$lib/components/manga/ChapterList.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import Tabs from '$lib/components/ui/Tabs.svelte';
  import type { Chapter } from '$lib/sources/types';

  export let chapters: Chapter[] = [];
  export let mangaId: string;
  export let sourceId: string;
  export let readMap: Record<string, number> = {};
  export let coverUrl = '';
  export let description = '';

  let activeTab = 'Chapters';
  let sort: 'newest' | 'oldest' = 'newest';
  $: tabItems = [
    { value: 'Chapters', label: `Chapter (${chapters.length})` },
    { value: 'Info', label: 'Info' },
    { value: 'Novel', label: 'Novel' }
  ];
</script>

<section class="content-index" aria-label="Konten manga">
  <div class="index-toolbar">
    <Tabs items={tabItems} bind:value={activeTab} aria-label="Pilih konten" />

    {#if activeTab === 'Chapters'}
      <div class="index-controls">
        <label>
          <span class="sr-only">Urutan chapter</span>
          <Select bind:value={sort}>
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
          </Select>
        </label>
        <Button variant="outline" size="icon" title="Muat ulang chapter" aria-label="Muat ulang chapter" on:click={() => location.reload()}>
          <RotateCcw size={18} />
        </Button>
      </div>
    {/if}
  </div>

  <div class="index-panel">
    {#if activeTab === 'Chapters'}
      <ChapterList {chapters} {mangaId} {sourceId} {readMap} {sort} {coverUrl} />
    {:else if activeTab === 'Info'}
      <Card><div class="index-prose">{description}</div></Card>
    {:else}
      <Card><div class="index-prose index-prose--muted">Novel belum tersedia untuk judul ini.</div></Card>
    {/if}
  </div>
</section>

<style>
  /* Hallmark · macrostructure: Index-First · tone: atmospheric · anchor hue: violet */
  .content-index {
    display: grid;
    gap: var(--space-lg);
  }

  .index-toolbar {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  .index-controls {
    display: flex;
    max-width: 100%;
    align-items: center;
    gap: var(--space-xs);
  }

  .index-panel { min-width: 0; }

  .index-prose {
    max-width: 65ch;
    padding: var(--space-lg);
    color: var(--color-ink-2);
    font-size: var(--text-base);
    line-height: 1.65;
    white-space: pre-line;
  }

  .index-prose--muted { color: var(--color-muted); }

  @media (min-width: 40rem) {
    .index-toolbar {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }
</style>
