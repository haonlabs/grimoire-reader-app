<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { ArrowLeft } from 'lucide-svelte';
  import MangaContentIndex from '$lib/components/manga/MangaContentIndex.svelte';
  import MangaDetailHero from '$lib/components/manga/MangaDetailHero.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Separator from '$lib/components/ui/Separator.svelte';
  import type { Chapter, MangaDetail } from '$lib/sources/types';
  import { library } from '$lib/stores/library';
  import { readChapters, readerPositions } from '$lib/stores/history';

  export let data: {
    sourceId: string;
    mangaId: string;
    manga: MangaDetail | null;
    chapters: Chapter[];
    error: string;
  };

  $: inLibrary = Boolean(
    data.manga && $library.some((entry) => entry.manga.id === data.manga?.id && entry.manga.sourceId === data.manga?.sourceId)
  );
  $: firstChapter = [...data.chapters].sort((a, b) => a.number - b.number)[0];
  $: lastReaderPosition = Object.entries($readerPositions)
    .filter(([key]) => key.startsWith(`${data.sourceId}:${data.mangaId}:`))
    .sort(([, a], [, b]) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  $: lastChapterId = lastReaderPosition?.[0].split(':').at(-1);
  $: continueChapter =
    data.chapters.find((chapter) => chapter.id === lastChapterId) ??
    data.chapters.find((chapter) => $readChapters[chapter.id] !== undefined) ??
    firstChapter;
  $: description = data.manga?.description ?? '';

  function addToLibrary() {
    if (!data.manga || inLibrary) return;
    library.update((entries) => [
      {
        manga: data.manga!,
        categoryId: 'reading',
        addedAt: new Date().toISOString()
      },
      ...entries
    ]);
  }

  function goBack() {
    if (browser && $page.url.searchParams.get('from') === 'reader') {
      goto(sessionStorage.getItem('grimoire_last_browse_path') || '/explore', { replaceState: true });
      return;
    }
    if (history.length > 1) {
      history.back();
      return;
    }
    goto('/explore');
  }
</script>

<svelte:head>
  <title>{data.manga?.title ?? 'Manga'} · Grimoire Reader</title>
</svelte:head>

{#if data.error || !data.manga}
  <div class="detail-error">
    <Card role="alert">
      <div class="detail-error__content">
        <p>Detail manga tidak dapat dimuat.</p>
        <span>{data.error}</span>
      </div>
    </Card>
  </div>
{:else}
  <div class="detail-back">
    <Button variant="ghost" size="sm" on:click={goBack}><ArrowLeft size={17} /> Kembali</Button>
  </div>

  <article class="manga-detail">
    <MangaDetailHero
      manga={data.manga}
      sourceId={data.sourceId}
      mangaId={data.mangaId}
      chapterCount={data.chapters.length}
      {continueChapter}
      continuing={Boolean(lastChapterId)}
      {inLibrary}
      onAddToLibrary={addToLibrary}
    />
    <Separator />
    <MangaContentIndex
      chapters={data.chapters}
      mangaId={data.mangaId}
      sourceId={data.sourceId}
      readMap={$readChapters}
      coverUrl={data.manga.coverUrl}
      {description}
    />
  </article>
{/if}

<style>
  /* Hallmark · macrostructure: Index-First · tone: atmospheric · anchor hue: violet */
  .detail-back {
    margin-block-end: var(--space-lg);
  }

  .manga-detail {
    display: grid;
    gap: var(--space-xl);
    color: var(--color-ink);
    font-family: var(--font-body);
  }

  .detail-error {
    max-width: 38rem;
    margin-inline: auto;
    padding-block: var(--space-2xl);
  }

  .detail-error__content {
    display: grid;
    gap: var(--space-xs);
    padding: var(--space-lg);
  }

  .detail-error__content p {
    margin: 0;
    color: var(--color-ink);
    font-family: var(--font-display);
    font-size: var(--text-md);
    font-weight: 700;
  }

  .detail-error__content span {
    color: var(--color-error);
    overflow-wrap: anywhere;
  }

  @media (max-width: 30rem) {
    .manga-detail {
      gap: var(--space-lg);
    }
  }
</style>
