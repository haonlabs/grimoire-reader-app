<script lang="ts">
  import { LoaderCircle } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let variant: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' = 'default';
  export let size: 'sm' | 'default' | 'icon' = 'default';
  export let disabled = false;
  export let loading = false;
  export let title: string | undefined = undefined;
  export let children: Snippet | undefined = undefined;

  $: variantClass =
    variant === 'secondary'
      ? 'border-white/10 bg-white/10 text-white hover:bg-white/15'
      : variant === 'outline'
        ? 'border-white/10 bg-transparent text-white hover:bg-white/10'
        : variant === 'ghost'
          ? 'border-transparent bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
          : variant === 'destructive'
            ? 'border-ember/30 bg-transparent text-ember hover:bg-ember/10'
            : 'border-ember bg-ember text-white hover:bg-ember/90';

  $: sizeClass =
    size === 'sm'
      ? 'h-9 px-3 text-sm'
      : size === 'icon'
        ? 'h-10 w-10 p-0'
        : 'h-10 px-4 text-sm';
</script>

<button
  {...$$restProps}
  {type}
  disabled={disabled || loading}
  {title}
  on:click
  class="focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-md border font-semibold transition disabled:pointer-events-none disabled:opacity-45 {variantClass} {sizeClass} {$$props.class ?? ''}"
>
  {#if loading}
    <LoaderCircle class="animate-spin" size={size === 'sm' ? 15 : 17} aria-hidden="true" />
  {/if}
  {@render children?.()}
</button>
