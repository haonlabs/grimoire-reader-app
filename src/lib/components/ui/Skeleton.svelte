<script lang="ts">
  import type { Snippet } from 'svelte';

  export let children: Snippet | undefined = undefined;
</script>

<div {...$$restProps} class="shimmer rounded-md bg-ink/10 dark:bg-white/10 {$$props.class ?? ''}">
  {@render children?.()}
</div>
