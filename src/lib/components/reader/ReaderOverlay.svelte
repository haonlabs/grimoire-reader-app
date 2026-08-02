<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { X } from 'lucide-svelte';
  import ReaderControlsOverlay from '$lib/components/reader/ReaderControlsOverlay.svelte';
  import ReaderSettingsDialog from '$lib/components/reader/ReaderSettingsDialog.svelte';
  import type { Chapter } from '$lib/sources/types';
  import { settings, type FitMode, type ReaderBackground } from '$lib/stores/settings';

  export let visible = true;
  export let mangaTitle = 'Reader';
  export let chapterTitle = '';
  export let chapter: Chapter;
  export let chapters: Chapter[] = [];
  export let sourceId = '';
  export let mangaId = '';

  let settingsOpen = false;
  let chapterListOpen = false;
  let autoScroll = false;
  let autoScrollSpeed = 2;
  let quality = 'high';
  let autoScrollTimer: ReturnType<typeof setInterval> | undefined;
  let currentChapterLink: HTMLAnchorElement | undefined;
  let didScrollCurrentChapter = false;

  $: navigationChapters = [...chapters].sort((a, b) => Number(a.number) - Number(b.number));
  $: sortedChapters = [...chapters].sort((a, b) => Number(b.number) - Number(a.number));
  $: currentChapterIndex = navigationChapters.findIndex((item) => item.id === chapter.id);
  $: previousChapter = currentChapterIndex > 0 ? navigationChapters[currentChapterIndex - 1] : undefined;
  $: nextChapter =
    currentChapterIndex >= 0 && currentChapterIndex < navigationChapters.length - 1
      ? navigationChapters[currentChapterIndex + 1]
      : undefined;
  $: if (!chapterListOpen) didScrollCurrentChapter = false;
  $: if (chapterListOpen && !didScrollCurrentChapter) {
    didScrollCurrentChapter = true;
    scrollCurrentChapterIntoView();
  }

  function back() {
    history.back();
  }

  function setFit(value: FitMode) {
    settings.update((current) => ({ ...current, reader: { ...current.reader, fit: value } }));
  }

  function setBackground(value: ReaderBackground) {
    settings.update((current) => ({ ...current, reader: { ...current.reader, background: value } }));
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function scrollToBottom() {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  }

  function stopAutoScroll() {
    autoScroll = false;
    if (autoScrollTimer) clearInterval(autoScrollTimer);
    autoScrollTimer = undefined;
  }

  function startAutoScroll() {
    stopAutoScroll();
    autoScroll = true;
    autoScrollTimer = setInterval(() => {
      window.scrollBy({ top: autoScrollSpeed, behavior: 'auto' });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) stopAutoScroll();
    }, 16);
  }

  function toggleAutoScroll() {
    if (autoScroll) stopAutoScroll();
    else startAutoScroll();
  }

  function updateAutoScrollSpeed(value: number) {
    autoScrollSpeed = value;
    if (autoScroll) startAutoScroll();
  }

  async function scrollCurrentChapterIntoView() {
    await tick();
    currentChapterLink?.scrollIntoView({ block: 'center' });
  }

  function markCurrentChapter(node: HTMLAnchorElement, isCurrent: boolean) {
    if (isCurrent) currentChapterLink = node;
    return {
      update(nextIsCurrent: boolean) {
        if (nextIsCurrent) currentChapterLink = node;
        else if (currentChapterLink === node) currentChapterLink = undefined;
      },
      destroy() {
        if (currentChapterLink === node) currentChapterLink = undefined;
      }
    };
  }

  onDestroy(stopAutoScroll);
</script>

{#if visible}
  <ReaderControlsOverlay
    {mangaTitle}
    {chapterTitle}
    currentChapterNumber={chapter.number}
    {currentChapterIndex}
    chapterCount={navigationChapters.length}
    {previousChapter}
    {nextChapter}
    {sourceId}
    {mangaId}
    {settingsOpen}
    {chapterListOpen}
    {autoScroll}
    on:back={back}
    on:scrollToTop={scrollToTop}
    on:scrollToBottom={scrollToBottom}
    on:settingsToggle={() => {
      settingsOpen = !settingsOpen;
      chapterListOpen = false;
    }}
    on:chapterListToggle={() => {
      chapterListOpen = !chapterListOpen;
      settingsOpen = false;
    }}
    on:autoScrollToggle={toggleAutoScroll}
  />

  <ReaderSettingsDialog
    open={settingsOpen}
    {quality}
    fit={$settings.reader.fit}
    background={$settings.reader.background}
    speed={autoScrollSpeed}
    {autoScroll}
    on:close={() => (settingsOpen = false)}
    on:qualityChange={(event) => (quality = event.detail)}
    on:fitChange={(event) => setFit(event.detail)}
    on:backgroundChange={(event) => setBackground(event.detail)}
    on:speedChange={(event) => updateAutoScrollSpeed(event.detail)}
    on:autoScrollToggle={toggleAutoScroll}
  />

  {#if chapterListOpen}
    <div class="fixed inset-0 z-50 grid place-items-end bg-black/40 p-3 text-white sm:place-items-center" role="presentation" on:click={() => (chapterListOpen = false)}>
      <div
        class="w-full max-w-lg rounded-lg border border-white/10 bg-[#111116] p-4 shadow-soft"
        role="dialog"
        tabindex="-1"
        aria-label="Chapter list"
        on:click|stopPropagation
        on:keydown|stopPropagation
      >
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold">Chapter list</h2>
            <p class="text-xs text-white/55">{sortedChapters.length} chapters · newest first</p>
          </div>
          <button class="focus-ring rounded-md bg-white/10 p-2" type="button" title="Close chapter list" on:click={() => (chapterListOpen = false)}>
            <X size={18} />
          </button>
        </div>

        <div class="max-h-[60vh] overflow-y-auto pr-1">
          {#each sortedChapters as item}
            <a
              use:markCurrentChapter={item.id === chapter.id}
              class="mb-1 flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition {item.id === chapter.id ? 'bg-white text-ink ring-2 ring-violet-400' : 'bg-white/5 text-white/75 hover:bg-white/10'}"
              href={`/manga/${sourceId}/${mangaId}/${item.id}`}
              aria-current={item.id === chapter.id ? 'page' : undefined}
            >
              <span class="min-w-0 truncate">Chapter {item.number || '?'}{item.title ? `: ${item.title}` : ''}</span>
              <span class="shrink-0 text-xs font-semibold opacity-70">{item.id === chapter.id ? 'Current' : item.language.toUpperCase()}</span>
            </a>
          {:else}
            <p class="rounded-md bg-white/5 p-3 text-sm text-white/55">No chapters found.</p>
          {/each}
        </div>
      </div>
    </div>
  {/if}
{/if}
