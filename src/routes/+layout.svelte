<script lang="ts">
  import {
    Bell,
    Bookmark,
    Clock,
    Compass,
    Settings,
    SlidersHorizontal,
    Sparkles
  } from 'lucide-svelte';
  import { page } from '$app/stores';
  import '../app.css';
  import SearchBar from '$lib/components/ui/SearchBar.svelte';
  import SourceSelector from '$lib/components/ui/SourceSelector.svelte';
  import { settings } from '$lib/stores/settings';
  import type { SourceMetadata } from '$lib/sources/types';

  export let data: { sources: SourceMetadata[] };

  const nav = [
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/library', label: 'Library', icon: Bookmark },
    { href: '/history', label: 'History', icon: Clock },
    { href: '/updates', label: 'Updates', icon: Bell },
    { href: '/sources', label: 'Sources', icon: SlidersHorizontal },
    { href: '/settings', label: 'Settings', icon: Settings }
  ];

  $: path = $page.url.pathname;
  $: isReader = /^\/manga\/[^/]+\/[^/]+\/[^/]+$/.test(path);
  $: activeSource = $settings.defaultSourceId;

  function setSource(event: Event) {
    const target = event.target as HTMLSelectElement;
    settings.update((value) => ({ ...value, defaultSourceId: target.value }));
  }
</script>

<svelte:head>
  <title>Grimoire Reader</title>
  <meta
    name="description"
    content="A stateless SvelteKit manga reader with source plugins and local-only user data."
  />
  <link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

{#if isReader}
  <slot />
{:else}
  <div class="min-h-screen pb-20 text-ink dark:text-white lg:pb-0 lg:pl-72">
    <aside class="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-ink/10 bg-paper/95 p-5 backdrop-blur dark:border-white/10 dark:bg-ink/95 lg:block">
      <a class="mb-7 flex items-center gap-3" href="/explore">
        <span class="grid h-11 w-11 place-items-center rounded-lg bg-ink text-white dark:bg-white dark:text-ink">
          <Sparkles size={22} />
        </span>
        <span>
          <span class="block text-lg font-bold">Grimoire Reader</span>
          <span class="block text-xs text-ink/55 dark:text-white/55">Local-first manga web app</span>
        </span>
      </a>

      <div class="mb-5">
        <SourceSelector sources={data.sources} selected={activeSource} on:change={setSource} />
      </div>

      <nav class="grid gap-1">
        {#each nav as item}
          <a
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition {path.startsWith(item.href) ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'text-ink/70 hover:bg-ink/5 dark:text-white/70 dark:hover:bg-white/10'}"
            href={item.href}
          >
            <svelte:component this={item.icon} size={18} />
            {item.label}
          </a>
        {/each}
      </nav>

      <p class="absolute bottom-5 left-5 right-5 text-xs leading-5 text-ink/45 dark:text-white/45">
        No accounts, no server database. Library, history, and settings stay in this browser.
      </p>
    </aside>

    <header class="sticky top-0 z-10 border-b border-ink/10 bg-paper/90 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-ink/90 lg:px-8">
      <div class="mx-auto flex max-w-7xl items-center gap-3">
        <a class="grid h-10 w-10 place-items-center rounded-lg bg-ink text-white dark:bg-white dark:text-ink lg:hidden" href="/explore">
          <Sparkles size={20} />
        </a>
        <SearchBar {activeSource} />
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <slot />
    </main>

    <nav class="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-ink/10 bg-paper/95 px-1 py-2 backdrop-blur dark:border-white/10 dark:bg-ink/95 lg:hidden">
      {#each nav.slice(0, 5) as item}
        <a
          class="flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium {path.startsWith(item.href) ? 'text-ember' : 'text-ink/60 dark:text-white/60'}"
          href={item.href}
        >
          <svelte:component this={item.icon} size={20} />
          {item.label === 'Sources' ? 'More' : item.label}
        </a>
      {/each}
    </nav>
  </div>
{/if}
