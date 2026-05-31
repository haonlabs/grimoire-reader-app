<script lang="ts">
  import { Plus, Trash2 } from 'lucide-svelte';
  import MangaGrid from '$lib/components/manga/MangaGrid.svelte';
  import { categories, library } from '$lib/stores/library';
  import { enabledSources } from '$lib/stores/settings';

  let activeCategory = 'all';
  let view: 'grid' | 'list' = 'grid';
  let sort: 'added' | 'read' | 'title' = 'added';
  let newCategory = '';

  $: entries = $library
    .filter((entry) => activeCategory === 'all' || entry.categoryId === activeCategory)
    .filter((entry) => $enabledSources.includes(entry.manga.sourceId))
    .sort((a, b) => {
      if (sort === 'title') return a.manga.title.localeCompare(b.manga.title);
      if (sort === 'read') return (b.lastReadAt ?? '').localeCompare(a.lastReadAt ?? '');
      return b.addedAt.localeCompare(a.addedAt);
    });
  $: manga = entries.map((entry) => entry.manga);

  function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    categories.update((items) => [...items, { id: crypto.randomUUID(), name }]);
    newCategory = '';
  }

  function removeSelected() {
    const ids = new Set(entries.map((entry) => `${entry.manga.sourceId}:${entry.manga.id}`));
    library.update((items) => items.filter((entry) => !ids.has(`${entry.manga.sourceId}:${entry.manga.id}`)));
  }
</script>

<section class="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
  <div>
    <p class="text-sm font-medium text-ember">Library</p>
    <h1 class="mt-1 text-3xl font-bold">Saved manga</h1>
  </div>
  <div class="flex flex-wrap gap-2">
    <select class="focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10" bind:value={sort}>
      <option value="added">Recently added</option>
      <option value="read">Last read</option>
      <option value="title">Title A-Z</option>
    </select>
    <select class="focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10" bind:value={view}>
      <option value="grid">Grid</option>
      <option value="list">List</option>
    </select>
    <button class="focus-ring rounded-lg border border-ember/30 px-3 py-2 text-sm text-ember" type="button" on:click={removeSelected}>
      <Trash2 size={16} />
    </button>
  </div>
</section>

<div class="mb-5 flex gap-2 overflow-x-auto pb-1">
  {#each $categories as category}
    <button
      class="focus-ring whitespace-nowrap rounded-lg px-3 py-2 text-sm {activeCategory === category.id ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'border border-ink/10 bg-white text-ink/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70'}"
      type="button"
      on:click={() => (activeCategory = category.id)}
    >
      {category.name}
    </button>
  {/each}
</div>

<form class="mb-6 flex max-w-md gap-2" on:submit|preventDefault={addCategory}>
  <input class="focus-ring min-h-10 flex-1 rounded-lg border border-ink/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/10" bind:value={newCategory} placeholder="New category" />
  <button class="focus-ring rounded-lg bg-ink px-3 text-white dark:bg-white dark:text-ink" type="submit" title="Create category">
    <Plus size={18} />
  </button>
</form>

{#if manga.length}
  <MangaGrid items={manga} {view} />
{:else}
  <div class="rounded-lg border border-ink/10 bg-white p-6 text-sm text-ink/55 dark:border-white/10 dark:bg-white/5 dark:text-white/55">
    Your library is empty. Add manga from a detail page and it will appear here.
  </div>
{/if}
