<script lang="ts">
  import type { Snippet } from 'svelte';

  export let value = '';
  export let disabled = false;
  export let children: Snippet | undefined = undefined;
</script>

<select
  {...$$restProps}
  bind:value
  {disabled}
  on:change
  class="focus-ring flex h-10 rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm normal-case text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 {$$props.class ?? ''}"
>
  {@render children?.()}
</select>
