<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    ChevronLeft,
    ChevronRight,
    Home,
    List as ListIcon,
    Monitor,
    Moon,
    Pause,
    Play,
    Settings,
    Sun,
    X
  } from 'lucide-svelte';
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

  const fits: { value: FitMode; label: string }[] = [
    { value: 'width', label: 'Width' },
    { value: 'screen', label: 'Screen' },
    { value: 'height', label: 'Height' },
    { value: 'original', label: 'Original' }
  ];

  const backgrounds: { value: ReaderBackground; label: string; icon: typeof Moon }[] = [
    { value: 'black', label: 'Black', icon: Moon },
    { value: 'white', label: 'White', icon: Sun },
    { value: 'sepia', label: 'Sepia', icon: Monitor }
  ];

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
  <div class="pointer-events-none fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-black/90 via-black/65 to-transparent p-3 pb-16 text-white">
    <div
      class="pointer-events-auto mx-auto flex max-w-5xl items-center gap-3 rounded-lg border border-white/10 bg-black/55 p-2 shadow-soft backdrop-blur"
      role="presentation"
      on:click|stopPropagation
      on:keydown|stopPropagation
    >
      <button class="focus-ring rounded-md bg-white/10 p-2 transition hover:bg-white/20" type="button" title="Back" on:click={back}>
        <ArrowLeft size={20} />
      </button>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold">{mangaTitle}</p>
        <p class="truncate text-xs text-white/60">{chapterTitle}</p>
      </div>
    </div>
  </div>

  <div class="pointer-events-none fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 text-white sm:flex">
    <button class="pointer-events-auto focus-ring rounded-md bg-black/70 p-2 shadow-soft backdrop-blur transition hover:bg-black" type="button" title="Scroll up" on:click|stopPropagation={scrollToTop}>
      <ArrowUp size={20} />
    </button>
    <button class="pointer-events-auto focus-ring rounded-md bg-black/70 p-2 shadow-soft backdrop-blur transition hover:bg-black" type="button" title="Scroll down" on:click|stopPropagation={scrollToBottom}>
      <ArrowDown size={20} />
    </button>
  </div>

  <div class="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-3 pt-16 text-white">
    <div
      class="pointer-events-auto mx-auto grid max-w-5xl gap-3 rounded-lg border border-white/10 bg-black/70 p-2 shadow-soft backdrop-blur"
      role="presentation"
      on:click|stopPropagation
      on:keydown|stopPropagation
    >
      <div class="grid grid-cols-6 gap-1">
        <a
          class="focus-ring grid place-items-center rounded-md bg-white/10 p-2 transition hover:bg-white/20"
          href={`/manga/${sourceId}/${mangaId}`}
          title="Home"
        >
          <Home size={20} />
        </a>

        {#if previousChapter}
          <a
            class="focus-ring grid place-items-center rounded-md bg-white/10 p-2 transition hover:bg-white/20"
            href={`/manga/${sourceId}/${mangaId}/${previousChapter.id}`}
            title="Previous chapter"
          >
            <ChevronLeft size={20} />
          </a>
        {:else}
          <button class="grid place-items-center rounded-md bg-white/5 p-2 text-white/30" type="button" title="No previous chapter" disabled>
            <ChevronLeft size={20} />
          </button>
        {/if}

        <button
          class="focus-ring grid place-items-center rounded-md bg-white/10 p-2 transition hover:bg-white/20 {settingsOpen ? 'bg-white text-ink' : ''}"
          type="button"
          title="Reader settings"
          aria-expanded={settingsOpen}
          on:click={() => {
            settingsOpen = !settingsOpen;
            chapterListOpen = false;
          }}
        >
          <Settings size={20} />
        </button>

        <button
          class="focus-ring grid place-items-center rounded-md bg-white/10 p-2 transition hover:bg-white/20 {chapterListOpen ? 'bg-white text-ink' : ''}"
          type="button"
          title="Chapter list"
          aria-expanded={chapterListOpen}
          on:click={() => {
            chapterListOpen = !chapterListOpen;
            settingsOpen = false;
          }}
        >
          <ListIcon size={20} />
        </button>

        {#if nextChapter}
          <a
            class="focus-ring grid place-items-center rounded-md bg-white/10 p-2 transition hover:bg-white/20"
            href={`/manga/${sourceId}/${mangaId}/${nextChapter.id}`}
            title="Next chapter"
          >
            <ChevronRight size={20} />
          </a>
        {:else}
          <button
            class="grid place-items-center rounded-md bg-white/5 p-2 text-white/30"
            type="button"
            title="No next chapter"
            disabled
          >
            <ChevronRight size={20} />
          </button>
        {/if}

        <button
          class="focus-ring grid place-items-center rounded-md bg-white/10 p-2 transition hover:bg-white/20 {autoScroll ? 'bg-white text-ink' : ''}"
          type="button"
          title="Autoscroll"
          on:click={toggleAutoScroll}
        >
          {#if autoScroll}<Pause size={20} />{:else}<Play size={20} />{/if}
        </button>
      </div>
    </div>
  </div>

  {#if settingsOpen}
    <div class="fixed inset-0 z-50 grid place-items-end bg-black/40 p-3 text-white sm:place-items-center" role="presentation" on:click={() => (settingsOpen = false)}>
      <div
        class="w-full max-w-lg rounded-lg border border-white/10 bg-[#111116] p-4 shadow-soft"
        role="dialog"
        tabindex="-1"
        aria-label="Reader settings"
        on:click|stopPropagation
        on:keydown|stopPropagation
      >
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-base font-semibold">Reader settings</h2>
          <button class="focus-ring rounded-md bg-white/10 p-2" type="button" title="Close settings" on:click={() => (settingsOpen = false)}>
            <X size={18} />
          </button>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-white/55">
            Page quality
            <select class="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm normal-case text-white" bind:value={quality}>
              <option class="bg-ink" value="low">Low</option>
              <option class="bg-ink" value="medium">Medium</option>
              <option class="bg-ink" value="high">High</option>
            </select>
          </label>

          <label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-white/55">
            Fit
            <select
              class="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm normal-case text-white"
              value={$settings.reader.fit}
              on:change={(event) => setFit((event.target as HTMLSelectElement).value as FitMode)}
            >
              {#each fits as item}
                <option class="bg-ink" value={item.value}>{item.label}</option>
              {/each}
            </select>
          </label>

          <label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-white/55">
            Autoscroll speed
            <input
              class="accent-ember"
              type="range"
              min="1"
              max="8"
              value={autoScrollSpeed}
              on:input={(event) => updateAutoScrollSpeed(Number((event.target as HTMLInputElement).value))}
            />
          </label>
        </div>

        <div class="mt-3 grid gap-1 text-xs font-medium uppercase tracking-wide text-white/55">
          Background
          <div class="grid grid-cols-3 gap-1 rounded-md border border-white/10 bg-white/10 p-1">
            {#each backgrounds as item}
              <button
                class="focus-ring inline-flex items-center justify-center gap-1 rounded px-2 py-2 text-xs normal-case transition {$settings.reader.background === item.value ? 'bg-white text-ink' : 'text-white/70 hover:bg-white/10'}"
                type="button"
                title={item.label}
                on:click={() => setBackground(item.value)}
              >
                <svelte:component this={item.icon} size={14} />
                <span>{item.label}</span>
              </button>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}

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
