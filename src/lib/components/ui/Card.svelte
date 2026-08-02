<script lang="ts">
  import type { Snippet } from 'svelte';

  export let children: Snippet | undefined = undefined;
</script>

<div {...$$restProps} class="card {$$props.class ?? ''}">
  {@render children?.()}
</div>

<style>
  /* Hallmark · component: card · genre: atmospheric · theme: Midnight */
  .card {
    border: var(--rule-thin) solid var(--color-rule);
    border-radius: var(--radius-card);
    background: var(--color-paper-2);
    color: var(--color-ink);
  }
</style>
