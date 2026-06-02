<script lang="ts">
  import { tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { ArrowLeft, Bookmark, BookOpen, Check, Eye, RotateCcw, Star, Trophy } from 'lucide-svelte';
  import ChapterList from '$lib/components/manga/ChapterList.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import type { Chapter, MangaDetail } from '$lib/sources/types';
  import { proxiedImageUrl } from '$lib/utils/image';
  import { mangaFormatLabel } from '$lib/utils/mangaFormat';
  import { library } from '$lib/stores/library';
  import { readChapters, readerPositions } from '$lib/stores/history';

  export let data: {
    sourceId: string;
    mangaId: string;
    manga: MangaDetail | null;
    chapters: Chapter[];
    error: string;
  };

  let sort: 'newest' | 'oldest' = 'newest';
  let coverLoaded = false;
  let coverFailed = false;
  let coverElement: HTMLImageElement | undefined;
  let lastCoverUrl = '';
  let coverCheckQueued = false;
  let activeTab: 'Chapters' | 'Info' | 'Novel' = 'Chapters';
  let descriptionOpen = false;
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
  $: ratingLabel = data.manga?.rating ? data.manga.rating.toFixed(1) : '-';
  $: description = data.manga?.description ?? '';
  $: formatLabel = data.manga ? mangaFormatLabel(data.manga) : 'Manga';
  $: coverUrl = data.manga?.coverUrl ?? '';
  $: if (coverUrl !== lastCoverUrl) {
    lastCoverUrl = coverUrl;
    coverLoaded = false;
    coverFailed = false;
  }
  $: if (coverElement && coverUrl && !coverLoaded && !coverFailed) checkCachedCover();

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

  function setActiveTab(tab: string) {
    if (tab === 'Chapters' || tab === 'Info' || tab === 'Novel') activeTab = tab;
  }

  function goBack() {
    if (history.length > 1) {
      history.back();
      return;
    }
    goto('/explore');
  }

  async function checkCachedCover() {
    if (coverCheckQueued) return;
    coverCheckQueued = true;
    await tick();
    coverCheckQueued = false;
    if (!coverElement || coverLoaded || coverFailed) return;
    if (!coverElement.complete) return;
    if (coverElement.naturalWidth > 0) coverLoaded = true;
    else coverFailed = true;
  }
</script>

<svelte:head>
  <title>{data.manga?.title ?? 'Manga'} · Grimoire Reader</title>
</svelte:head>

{#if data.error || !data.manga}
  <div class="rounded-lg border border-red-500/30 bg-red-500/10 p-5 text-red-200">
    <p class="font-semibold">Unable to load manga</p>
    <p class="mt-1 text-sm">{data.error}</p>
  </div>
{:else}
  <button
    class="focus-ring mb-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
    type="button"
    on:click={goBack}
  >
    <ArrowLeft size={17} />
    Kembali
  </button>

  <section class="grid gap-6 lg:grid-cols-[18rem_1fr]">
    <div class="mx-auto w-52 sm:w-64 lg:sticky lg:top-24 lg:w-full lg:self-start">
      <div class="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 shadow-soft">
        {#if data.manga.coverUrl && !coverFailed}
          {#if !coverLoaded}
            <Skeleton class="absolute inset-0 rounded-none" />
          {/if}
          <img
            bind:this={coverElement}
            class="aspect-[2/3] w-full object-cover transition-opacity duration-200 {coverLoaded ? 'opacity-100' : 'opacity-0'}"
            src={proxiedImageUrl(data.manga.coverUrl)}
            alt={data.manga.title}
            loading="eager"
            fetchpriority="high"
            decoding="async"
            on:load={() => (coverLoaded = true)}
            on:error={() => {
              coverLoaded = true;
              coverFailed = true;
            }}
          />
        {:else}
          <div class="grid aspect-[2/3] place-items-center bg-white/10 text-sm text-white/45">No cover</div>
        {/if}
        <span class="absolute left-3 top-3 rounded-full bg-black/75 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-soft">
          {formatLabel}
        </span>
      </div>
    </div>

    <div class="min-w-0">
      <p class="text-sm font-semibold uppercase tracking-wide text-violet-300">{data.sourceId}</p>
      <h1 class="mt-1 text-3xl font-extrabold leading-tight text-white md:text-4xl">{data.manga.title}</h1>

      <div class="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {#if continueChapter}
          <a
            class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white"
            href={`/manga/${data.sourceId}/${data.mangaId}/${continueChapter.id}`}
          >
            <BookOpen size={17} />
            {lastChapterId ? 'Lanjutkan' : 'Baca'}
          </a>
        {/if}
        <button
          class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#141416] px-4 py-3 text-sm font-semibold text-white"
          type="button"
          on:click={addToLibrary}
        >
          {#if inLibrary}<Check size={17} /> Bookmark{:else}<Bookmark size={17} /> Bookmark{/if}
        </button>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div class="rounded-lg border border-white/10 bg-[#101012] p-3">
          <div class="flex items-center gap-2 text-gold"><Star size={17} class="fill-gold" /><span class="font-bold">{ratingLabel}</span></div>
          <p class="mt-1 text-xs text-white/45">Rating</p>
        </div>
        <div class="rounded-lg border border-white/10 bg-[#101012] p-3">
          <div class="flex items-center gap-2 text-white"><Bookmark size={17} /><span class="font-bold">{data.chapters.length}</span></div>
          <p class="mt-1 text-xs text-white/45">Chapter</p>
        </div>
        <div class="rounded-lg border border-white/10 bg-[#101012] p-3">
          <div class="flex items-center gap-2 text-white"><Eye size={17} /><span class="font-bold capitalize">{data.manga.status}</span></div>
          <p class="mt-1 text-xs text-white/45">Status</p>
        </div>
        <div class="rounded-lg border border-white/10 bg-[#101012] p-3">
          <div class="flex items-center gap-2 text-white"><Trophy size={17} /><span class="font-bold">{data.manga.year ?? '-'}</span></div>
          <p class="mt-1 text-xs text-white/45">Year</p>
        </div>
      </div>

      <div class="mt-5 max-w-3xl">
        <p class="whitespace-pre-line text-sm leading-7 text-white/70 {descriptionOpen ? '' : 'line-clamp-4'}">{description}</p>
        {#if description.length > 220}
          <button class="mt-2 text-sm font-semibold text-violet-300" type="button" on:click={() => (descriptionOpen = !descriptionOpen)}>
            {descriptionOpen ? 'Read Less' : 'Read More'}
          </button>
        {/if}
      </div>

      <div class="mt-6 grid gap-3">
        {#if data.manga.genres.length}
          <div>
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">Genre</p>
            <div class="flex flex-wrap gap-2">
              {#each data.manga.genres as genre}
                <span class="rounded-md border border-white/10 bg-[#141416] px-2 py-1 text-xs text-white/70">{genre}</span>
              {/each}
            </div>
          </div>
        {/if}
        <div class="grid gap-3 sm:grid-cols-2">
          {#if data.manga.author}
            <div>
              <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">Author</p>
              <span class="rounded-md border border-white/10 bg-[#141416] px-2 py-1 text-xs text-white/70">{data.manga.author}</span>
            </div>
          {/if}
          {#if data.manga.artist}
            <div>
              <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">Artist</p>
              <span class="rounded-md border border-white/10 bg-[#141416] px-2 py-1 text-xs text-white/70">{data.manga.artist}</span>
            </div>
          {/if}
          <div>
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">Format</p>
            <span class="rounded-md border border-white/10 bg-[#141416] px-2 py-1 text-xs text-white/70">{formatLabel}</span>
          </div>
          <div>
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">Type</p>
            <span class="rounded-md border border-white/10 bg-[#141416] px-2 py-1 text-xs text-white/70 capitalize">{data.sourceId}</span>
          </div>
        </div>
      </div>

      <div class="mt-8">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
          <div class="flex gap-1">
            {#each ['Chapters', 'Info', 'Novel'] as tab}
              <button
                class="focus-ring px-4 py-3 text-sm font-semibold {activeTab === tab ? 'border-b-2 border-violet-500 text-white' : 'text-white/50'}"
                type="button"
                on:click={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            {/each}
          </div>
          {#if activeTab === 'Chapters'}
            <div class="flex items-center gap-2 pb-3">
              <select class="focus-ring rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-sm text-white" bind:value={sort}>
                <option class="bg-ink" value="newest">Newest</option>
                <option class="bg-ink" value="oldest">Oldest</option>
              </select>
              <button class="focus-ring rounded-lg border border-white/10 bg-[#141416] p-2 text-white" title="Refresh" on:click={() => location.reload()}>
                <RotateCcw size={18} />
              </button>
            </div>
          {/if}
        </div>

        {#if activeTab === 'Chapters'}
          <ChapterList chapters={data.chapters} mangaId={data.mangaId} sourceId={data.sourceId} readMap={$readChapters} {sort} coverUrl={data.manga.coverUrl} />
        {:else if activeTab === 'Info'}
          <div class="rounded-lg border border-white/10 bg-[#101012] p-4 text-sm leading-7 text-white/65">
            {description}
          </div>
        {:else}
          <div class="rounded-lg border border-white/10 bg-[#101012] p-4 text-sm text-white/55">
            Novel belum tersedia untuk judul ini.
          </div>
        {/if}
      </div>
    </div>
  </section>
{/if}
