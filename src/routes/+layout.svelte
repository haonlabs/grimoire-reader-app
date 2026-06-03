<script lang="ts">
  import { browser } from '$app/environment';
  import { navigating, page } from '$app/stores';
  import SearchBar from '$lib/components/ui/SearchBar.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import { settings } from '$lib/stores/settings';
  import {
    Bell,
    Bookmark,
    Clock,
    Compass,
    Home,
    LoaderCircle,
    SlidersHorizontal,
    Sparkles,
    UserCircle
  } from 'lucide-svelte';
  import '../app.css';

  const nav = [
    { href: '/explore', label: 'Home', icon: Home },
    { href: '/search', label: 'Explore', icon: Compass },
    { href: '/library', label: 'Library', icon: Bookmark },
    { href: '/history', label: 'History', icon: Clock },
    { href: '/updates', label: 'Updates', icon: Bell },
    { href: '/sources', label: 'Source Manager', icon: SlidersHorizontal }
  ];
  const mobileNav = nav.filter((item) =>
    ['Home', 'Explore', 'Library', 'Source Manager'].includes(item.label)
  );

  $: path = $page.url.pathname;
  $: isReader = /^\/manga\/[^/]+\/[^/]+\/[^/]+$/.test(path);
  $: isMangaDetail = /^\/manga\/[^/]+\/[^/]+$/.test(path);
  $: isProfile = path === '/profile' || path.startsWith('/profile/');
  $: activeSource = $settings.defaultSourceId;
  $: if (browser && !isReader && !isMangaDetail) {
    sessionStorage.setItem('grimoire_last_browse_path', `${$page.url.pathname}${$page.url.search}`);
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

{#if $navigating}
  <div class="fixed inset-x-0 top-0 z-50 h-1 bg-violet-500/15">
    <Skeleton class="h-full w-full rounded-none bg-violet-500/50" />
  </div>
  <div class="fixed right-4 top-4 z-50 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/75 text-white shadow-soft backdrop-blur" aria-label="Loading page">
    <LoaderCircle class="animate-spin" size={18} />
  </div>
{/if}

{#if isReader}
  <slot />
{:else}
  <div class="dark min-h-screen bg-[#050506] pb-20 text-white lg:pb-0">
    <header class="sticky top-0 z-10 border-b border-white/10 bg-[#050506]/95 px-4 py-3 backdrop-blur lg:px-8">
      <div class="mx-auto flex w-full max-w-[100rem] items-center gap-3">
        <a class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black" href="/explore" aria-label="Home">
          <Sparkles size={20} />
        </a>
        <a class="hidden shrink-0 items-center gap-2 sm:flex" href="/explore" aria-label="Home">
          <span class="text-sm font-extrabold tracking-wide">GRIMOIRE</span>
        </a>
        {#if isProfile}
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-white">Profile</p>
            <p class="truncate text-xs text-white/45">Menu dan source</p>
          </div>
        {:else}
          <SearchBar {activeSource} />
        {/if}
        <a
          class="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-white"
          href="/profile"
          title="Profile"
        >
          <UserCircle size={21} />
        </a>
      </div>
    </header>

    <main class="mx-auto w-full max-w-[100rem] px-4 py-6 lg:px-6">
      <slot />
    </main>

    <nav class="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-white/10 bg-[#101012]/95 px-1 py-2 backdrop-blur lg:hidden">
      {#each mobileNav as item}
        <a
          class="flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium {path.startsWith(item.href) ? 'text-violet-400' : 'text-white/60'}"
          href={item.href}
        >
          <svelte:component this={item.icon} size={20} />
          {item.label}
        </a>
      {/each}
    </nav>
  </div>
{/if}
