<script lang="ts">
  import { Download, Upload, Trash2 } from 'lucide-svelte';
  import { library } from '$lib/stores/library';
  import { history } from '$lib/stores/history';
  import { settings } from '$lib/stores/settings';

  let importText = '';

  function exportLibrary() {
    const blob = new Blob([JSON.stringify($library, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'grimoire-library.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importLibrary() {
    const parsed = JSON.parse(importText);
    if (Array.isArray(parsed)) library.set(parsed);
    importText = '';
  }
</script>

<section class="mb-6">
  <p class="text-sm font-medium text-ember">Settings</p>
  <h1 class="mt-1 text-3xl font-bold">Reader and app preferences</h1>
</section>

<div class="grid gap-6 xl:grid-cols-2">
  <section class="rounded-lg border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-white/5">
    <h2 class="text-lg font-semibold">Reader</h2>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <label class="grid gap-1 text-sm">Fit
        <select class="focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/10" bind:value={$settings.reader.fit}>
          <option value="width">Fit Width</option>
          <option value="height">Fit Height</option>
          <option value="screen">Fit Screen</option>
          <option value="original">Original Size</option>
        </select>
      </label>
      <label class="grid gap-1 text-sm">Background
        <select class="focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/10" bind:value={$settings.reader.background}>
          <option value="black">Black</option>
          <option value="white">White</option>
          <option value="sepia">Sepia</option>
        </select>
      </label>
      <label class="grid gap-1 text-sm">Preload pages
        <input class="focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/10" type="number" min="1" max="10" bind:value={$settings.reader.preloadPages} />
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" bind:checked={$settings.reader.incognito} />
        Incognito reading
      </label>
    </div>
  </section>

  <section class="rounded-lg border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-white/5">
    <h2 class="text-lg font-semibold">Application</h2>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <label class="grid gap-1 text-sm">Theme
        <select class="focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/10" bind:value={$settings.theme}>
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label class="grid gap-1 text-sm">UI Language
        <select class="focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/10" bind:value={$settings.uiLanguage}>
          <option value="en">English</option>
          <option value="id">Indonesia</option>
        </select>
      </label>
      <label class="grid gap-1 text-sm">Default content rating
        <select class="focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/10" bind:value={$settings.defaultContentRating}>
          <option value="safe">Safe</option>
          <option value="suggestive">Suggestive</option>
          <option value="explicit">Explicit</option>
        </select>
      </label>
      <button class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-ember/30 px-3 py-2 text-sm text-ember" type="button" on:click={() => history.set([])}>
        <Trash2 size={16} />
        Clear history
      </button>
    </div>

    <div class="mt-5 grid gap-3">
      <button class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-ink" type="button" on:click={exportLibrary}>
        <Download size={16} />
        Export library JSON
      </button>
      <textarea class="focus-ring min-h-28 rounded-lg border border-ink/10 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/10" bind:value={importText} placeholder="Paste library backup JSON"></textarea>
      <button class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-ink/10 px-3 py-2 text-sm dark:border-white/10" type="button" on:click={importLibrary}>
        <Upload size={16} />
        Import library
      </button>
    </div>
  </section>
</div>

<section class="mt-6 rounded-lg border border-ink/10 bg-white p-5 text-sm leading-6 text-ink/65 dark:border-white/10 dark:bg-white/5 dark:text-white/65">
  <h2 class="text-lg font-semibold text-ink dark:text-white">About</h2>
  <p class="mt-2">
    Grimoire Reader does not host manga content, create user accounts, or persist user data on a server.
    Source requests are relayed for browsing and reading, while library, history, and settings stay in
    this browser through localStorage. Users are responsible for following the laws and terms that apply
    in their jurisdiction and to each source.
  </p>
</section>
