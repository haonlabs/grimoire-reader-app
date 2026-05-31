<script lang="ts">
  export let page = 0;
  export let total = 0;
</script>

<div class="flex items-center gap-3">
  <input
    class="h-1 flex-1 accent-ember"
    type="range"
    min="0"
    max={Math.max(0, total - 1)}
    bind:value={page}
    aria-label="Page progress"
  />
  <span class="w-16 text-right text-xs text-white/80">{Math.min(page + 1, total)}/{total}</span>
</div>
