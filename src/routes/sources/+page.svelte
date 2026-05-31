<script lang="ts">
  import { CheckCircle2, CircleOff, Search } from 'lucide-svelte';
  import type { SourceMetadata } from '$lib/sources/types';
  import { enabledSources } from '$lib/stores/settings';

  export let data: { sources: Array<SourceMetadata & { health?: { status: string; message?: string } }> };

  let query = '';
  let language = 'all';
  let rating = 'all';

  $: languages = ['all', ...new Set(data.sources.map((source) => source.language))];
  $: visible = data.sources.filter((source) => {
    const matchesText = source.name.toLowerCase().includes(query.toLowerCase());
    const matchesLanguage = language === 'all' || source.language === language;
    const matchesRating = rating === 'all' || source.contentRating === rating;
    return matchesText && matchesLanguage && matchesRating;
  });

  function toggleSource(id: string) {
    enabledSources.update((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id]
    );
  }
</script>

<section class="mb-6">
  <p class="text-sm font-medium text-ember">Source Manager</p>
  <h1 class="mt-1 text-3xl font-bold">Available sources</h1>
  <div class="mt-4 flex flex-col gap-3 md:flex-row">
    <label class="relative flex-1">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-ink/45 dark:text-white/45" size={17} />
      <input class="focus-ring h-11 w-full rounded-lg border border-ink/10 bg-white pl-9 pr-3 text-sm dark:border-white/10 dark:bg-white/10" bind:value={query} placeholder="Search source" />
    </label>
    <select class="focus-ring rounded-lg border border-ink/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/10" bind:value={language}>
      {#each languages as value}<option value={value}>{value === 'all' ? 'All languages' : value}</option>{/each}
    </select>
    <select class="focus-ring rounded-lg border border-ink/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/10" bind:value={rating}>
      <option value="all">All ratings</option>
      <option value="safe">Safe</option>
      <option value="suggestive">Suggestive</option>
      <option value="explicit">Explicit</option>
    </select>
  </div>
</section>

<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
  {#each visible as source}
    <article class="rounded-lg border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div class="flex items-start justify-between gap-3">
        <div class="flex gap-3">
          <span class="grid h-11 w-11 place-items-center rounded-lg bg-ink text-sm font-bold text-white dark:bg-white dark:text-ink">{source.icon}</span>
          <div>
            <h2 class="font-semibold">{source.name}</h2>
            <p class="text-xs text-ink/55 dark:text-white/55">{source.method} · {source.language} · {source.contentRating}</p>
          </div>
        </div>
        <button class="focus-ring rounded-full p-1 { $enabledSources.includes(source.id) ? 'text-moss' : 'text-ink/35 dark:text-white/35'}" type="button" title="Enable source" on:click={() => toggleSource(source.id)}>
          {#if $enabledSources.includes(source.id)}<CheckCircle2 size={22} />{:else}<CircleOff size={22} />{/if}
        </button>
      </div>
      <p class="mt-3 text-sm leading-6 text-ink/65 dark:text-white/65">{source.description}</p>
      <a class="mt-3 inline-block text-sm font-medium text-ember" href={source.baseUrl} target="_blank" rel="noreferrer">{source.baseUrl}</a>
      <p class="mt-3 text-xs capitalize text-ink/50 dark:text-white/50">Status: {source.health?.status ?? 'unknown'}{source.health?.message ? ` · ${source.health.message}` : ''}</p>
    </article>
  {/each}
</div>
