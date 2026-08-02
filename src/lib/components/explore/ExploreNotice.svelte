<script lang="ts">
  import { Bookmark, BookOpen, Megaphone } from 'lucide-svelte';
  import Badge from '$lib/components/ui/Badge.svelte';

  export let sourceName = '';
</script>

<aside class="notice-rail" aria-labelledby="notice-title">
  <div class="notice-rail__title">
    <Megaphone size={18} aria-hidden="true" />
    <h2 id="notice-title">Catatan membaca</h2>
  </div>

  <div class="notice-rail__items">
    <p>
      <Badge>{sourceName}</Badge>
      <span>Source aktif</span>
    </p>
    <p>
      <BookOpen size={16} aria-hidden="true" />
      <span>Menu reader muncul saat area baca diketuk.</span>
    </p>
    <p>
      <Bookmark size={16} aria-hidden="true" />
      <span>Library dan history tersimpan lokal.</span>
    </p>
  </div>
</aside>

<style>
  /* Hallmark · component: information rail · genre: atmospheric · theme: Midnight */
  .notice-rail {
    display: grid;
    gap: var(--space-sm);
    padding-block: var(--space-md) var(--space-xl);
    color: var(--color-ink-2);
  }

  .notice-rail__title,
  .notice-rail__items,
  .notice-rail__items p {
    display: flex;
    align-items: center;
  }

  .notice-rail__title {
    gap: var(--space-xs);
    color: var(--color-ink);
  }

  .notice-rail__title h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--text-sm);
    font-style: normal;
    font-weight: 700;
  }

  .notice-rail__items {
    min-width: 0;
    flex-wrap: wrap;
    gap: var(--space-sm) var(--space-lg);
  }

  .notice-rail__items p {
    min-width: 0;
    gap: var(--space-xs);
    margin: 0;
    color: var(--color-muted);
    font-size: var(--text-xs);
    line-height: 1.35;
  }

  @media (min-width: 64rem) {
    .notice-rail {
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: var(--space-xl);
    }

    .notice-rail__items p + p {
      padding-inline-start: var(--space-lg);
      border-inline-start: var(--rule-thin) solid var(--color-rule);
    }
  }
</style>
