<script lang="ts">
  import {
    Bell,
    Bookmark,
    Clock,
    Compass,
    Crown,
    Home,
    Settings,
    SlidersHorizontal,
    Sparkles,
    UserCircle
  } from 'lucide-svelte';
  import { navigating, page } from '$app/stores';
  import '../app.css';
  import SearchBar from '$lib/components/ui/SearchBar.svelte';
  import { settings } from '$lib/stores/settings';

  const nav = [
    { href: '/explore', label: 'Home', icon: Home },
    { href: '/search', label: 'Explore', icon: Compass },
    { href: '/library', label: 'Library', icon: Bookmark },
    { href: '/history', label: 'History', icon: Clock },
    { href: '/updates', label: 'Updates', icon: Bell },
    { href: '/sources', label: 'All Series', icon: SlidersHorizontal },
    { href: '/settings', label: 'Settings', icon: Settings }
  ];
  const mobileNav = nav.filter((item) =>
    ['Home', 'Explore', 'Library', 'All Series'].includes(item.label)
  );

  $: path = $page.url.pathname;
  $: isReader = /^\/manga\/[^/]+\/[^/]+\/[^/]+$/.test(path);
  $: isProfile = path === '/profile' || path.startsWith('/profile/');
  $: activeSource = $settings.defaultSourceId;
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
    <div class="h-full w-full shimmer bg-violet-500/50"></div>
  </div>
{/if}

{#if isReader}
  <slot />
{:else}
  <div class="dark min-h-screen bg-[#050506] pb-20 text-white lg:pb-0">
    <header class="sticky top-0 z-10 border-b border-white/10 bg-[#050506]/95 px-4 py-3 backdrop-blur lg:px-8">
      <div class="mx-auto flex max-w-7xl items-center gap-3">
        <a class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black" href="/explore" aria-label="Home">
          <Sparkles size={20} />
        </a>
        <a class="hidden shrink-0 items-center gap-2 sm:flex" href="/explore" aria-label="Home">
          <span class="text-sm font-extrabold tracking-wide">GRIMOIRE ID</span>
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
          class="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-600 text-white"
          href="/settings"
          title="Upgrade settings"
        >
          <Crown size={18} />
        </a>
        <a
          class="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-white"
          href="/profile"
          title="Profile"
        >
          <UserCircle size={21} />
        </a>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6 lg:px-8">
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
