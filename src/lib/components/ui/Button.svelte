<script lang="ts">
  import { LoaderCircle } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let variant: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' = 'default';
  export let size: 'sm' | 'default' | 'icon' = 'default';
  export let href: string | undefined = undefined;
  export let disabled = false;
  export let loading = false;
  export let title: string | undefined = undefined;
  export let children: Snippet | undefined = undefined;

  $: variantClass =
    variant === 'secondary'
      ? 'button--secondary'
      : variant === 'outline'
        ? 'button--outline'
        : variant === 'ghost'
          ? 'button--ghost'
          : variant === 'destructive'
            ? 'button--destructive'
            : 'button--default';

  $: sizeClass =
    size === 'sm'
      ? 'button--sm'
      : size === 'icon'
        ? 'button--icon'
        : 'button--size-default';
</script>

{#if href}
  <a
    {...$$restProps}
    href={disabled || loading ? undefined : href}
    aria-disabled={disabled || loading}
    tabindex={disabled || loading ? -1 : undefined}
    {title}
    on:click
    class="button {variantClass} {sizeClass} {$$props.class ?? ''}"
  >
    {#if loading}<LoaderCircle class="animate-spin" size={17} aria-hidden="true" />{/if}
    {@render children?.()}
  </a>
{:else}
  <button
    {...$$restProps}
    {type}
    disabled={disabled || loading}
    {title}
    on:click
    class="button {variantClass} {sizeClass} {$$props.class ?? ''}"
  >
    {#if loading}<LoaderCircle class="animate-spin" size={17} aria-hidden="true" />{/if}
    {@render children?.()}
  </button>
{/if}

<style>
  /* Hallmark · component: button · genre: atmospheric · theme: Midnight
   * states: default · hover · focus · active · disabled · loading · error · success
   * contrast: pass (46–50)
   */
  .button {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    border: var(--rule-thin) solid transparent;
    border-radius: var(--radius-sm);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 700;
    line-height: 1;
    text-decoration: none;
    white-space: nowrap;
    transition:
      background-color var(--dur-short) var(--ease-out),
      color var(--dur-short) var(--ease-out),
      transform var(--dur-micro) var(--ease-out);
  }

  .button:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .button:active {
    transform: translateY(1px);
  }

  .button:disabled,
  .button[aria-disabled='true'] {
    cursor: not-allowed;
    opacity: 0.55;
    pointer-events: none;
  }

  .button--default {
    background: var(--color-accent);
    color: var(--color-accent-ink);
  }

  .button--secondary {
    border-color: var(--color-rule);
    background: var(--color-paper-3);
    color: var(--color-ink);
  }

  .button--outline {
    border-color: var(--color-rule-strong);
    background: transparent;
    color: var(--color-ink);
  }

  .button--ghost {
    background: transparent;
    color: var(--color-ink-2);
  }

  .button--destructive {
    border-color: var(--color-error);
    background: transparent;
    color: var(--color-error);
  }

  .button--sm {
    min-height: 2.5rem;
    padding-inline: var(--space-sm);
  }

  .button--size-default {
    min-height: 2.75rem;
    padding-inline: var(--space-md);
  }

  .button--icon {
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
  }

  @media (hover: hover) and (pointer: fine) {
    .button--default:hover { background: var(--color-focus); }
    .button--secondary:hover { background: var(--color-paper-raised); }
    .button--outline:hover,
    .button--ghost:hover { background: var(--color-paper-3); color: var(--color-ink); }
    .button--destructive:hover { background: var(--color-paper-3); }
  }

  @media (prefers-reduced-motion: reduce) {
    .button { transition: none; }
    .button:active { transform: none; }
  }
</style>
