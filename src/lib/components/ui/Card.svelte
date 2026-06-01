<script lang="ts">
  import type { Snippet } from 'svelte';

  export let children: Snippet | undefined = undefined;
</script>

<div {...$$restProps} class="rounded-lg border border-white/10 bg-[#101012] text-white shadow-sm {$$props.class ?? ''}">
  {@render children?.()}
</div>
