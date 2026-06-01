<script lang="ts">
  import {
    Bell,
    Bookmark,
    Clock,
    Compass,
    Home,
    Settings,
    SlidersHorizontal,
    UserCircle
  } from 'lucide-svelte';
  import SourceSelector from '$lib/components/ui/SourceSelector.svelte';
  import { enabledSources, settings } from '$lib/stores/settings';
  import type { SourceMetadata } from '$lib/sources/types';

  export let data: { sources: SourceMetadata[] };

  const menus = [
    { href: '/explore', label: 'Home', icon: Home, description: 'Rekomendasi dan update terbaru' },
    { href: '/search', label: 'Explore', icon: Compass, description: 'Cari judul dari source aktif atau semua source' },
    { href: '/library', label: 'Library', icon: Bookmark, description: 'Readlist dan koleksi lokal' },
    { href: '/history', label: 'History', icon: Clock, description: 'Lanjutkan chapter terakhir' },
    { href: '/updates', label: 'Updates', icon: Bell, description: 'Chapter baru dari library' },
    { href: '/sources', label: 'All Series', icon: SlidersHorizontal, description: 'Kelola semua source' },
    { href: '/settings', label: 'Settings', icon: Settings, description: 'Preferensi reader dan aplikasi' }
  ];

  $: activeSource = $settings.defaultSourceId;
  $: addedSources = data.sources.filter((source) => source.isImplemented !== false && $enabledSources.includes(source.id));
  $: sourceName = addedSources.find((source) => source.id === activeSource)?.name ?? activeSource;

  function setSource(event: Event) {
    const target = event.target as HTMLSelectElement;
    settings.update((value) => ({ ...value, defaultSourceId: target.value }));
  }
</script>

<svelte:head>
  <title>Profile · Grimoire Reader</title>
</svelte:head>

<section class="mb-5 rounded-lg border border-white/10 bg-[#101012] p-5">
  <div class="flex items-center gap-3">
    <div class="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/10 text-white">
      <UserCircle size={30} />
    </div>
    <div>
      <p class="text-sm font-semibold uppercase tracking-wide text-violet-300">Profile</p>
      <h1 class="mt-1 text-2xl font-extrabold text-white">Menu</h1>
      <p class="mt-1 text-sm text-white/55">Library, history, source, dan settings.</p>
    </div>
  </div>
</section>

<section class="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
  {#each menus as item}
    <a
      class="group flex items-center gap-3 rounded-lg border border-white/10 bg-[#101012] p-4 transition hover:border-violet-500/40 hover:bg-white/10"
      href={item.href}
    >
      <span class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/10 text-white transition group-hover:bg-violet-600">
        <svelte:component this={item.icon} size={21} />
      </span>
      <span class="min-w-0">
        <span class="block font-semibold text-white">{item.label}</span>
        <span class="mt-1 line-clamp-2 block text-sm leading-5 text-white/55">{item.description}</span>
      </span>
    </a>
  {/each}
</section>

<section class="rounded-lg border border-white/10 bg-[#101012] p-5">
  <p class="text-sm font-semibold uppercase tracking-wide text-violet-300">Default Source</p>
  <p class="mt-1 text-sm text-white/55">Source aktif: {sourceName}</p>
  <div class="mt-4 max-w-md">
    <SourceSelector sources={addedSources} selected={activeSource} on:change={setSource} />
  </div>
</section>

<section class="mt-5 rounded-lg border border-white/10 bg-[#101012] p-4 text-sm leading-6 text-white/55">
  Library, history, read chapters, dan settings disimpan lokal di browser ini.
</section>
