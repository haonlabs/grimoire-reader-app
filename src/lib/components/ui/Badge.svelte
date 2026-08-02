<script lang="ts">
  import type { Snippet } from 'svelte';

  export let variant: 'default' | 'secondary' | 'outline' = 'secondary';
  export let children: Snippet | undefined = undefined;
</script>

<span {...$$restProps} class="badge badge--{variant} {$$props.class ?? ''}">
  {@render children?.()}
</span>

<style>
  /* Hallmark · component: badge · genre: atmospheric · theme: Midnight */
  .badge {
    display: inline-flex;
    min-height: 1.75rem;
    align-items: center;
    padding-inline: var(--space-xs);
    border: var(--rule-thin) solid transparent;
    border-radius: var(--radius-pill);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
  }

  .badge--default { background: var(--color-accent); color: var(--color-accent-ink); }
  .badge--secondary { background: var(--color-paper-3); color: var(--color-ink-2); }
  .badge--outline { border-color: var(--color-rule-strong); color: var(--color-ink-2); }
</style>
