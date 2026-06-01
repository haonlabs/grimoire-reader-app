<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  export let label = 'Memuat konten';
  export let value: number | undefined = undefined;

  let estimate = 8;
  let timer: ReturnType<typeof setInterval> | undefined;

  $: progress = Math.max(0, Math.min(100, Math.round(value ?? estimate)));
  $: isEstimated = value === undefined;

  onMount(() => {
    if (value !== undefined) return;
    timer = setInterval(() => {
      estimate = Math.min(94, estimate + Math.max(1, Math.round((96 - estimate) / 9)));
    }, 520);
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
</script>

<div class="rounded-lg border border-white/10 bg-black/35 p-3 text-white shadow-soft backdrop-blur">
  <div class="mb-2 flex items-center justify-between gap-3 text-xs">
    <span class="font-semibold">{label}</span>
    <span class="tabular-nums text-white/70">{isEstimated ? '~' : ''}{progress}%</span>
  </div>
  <div
    class="h-1.5 overflow-hidden rounded-full bg-white/10"
    role="progressbar"
    aria-label={label}
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={progress}
  >
    <div class="h-full rounded-full bg-violet-500 transition-[width] duration-300" style={`width: ${progress}%`}></div>
  </div>
</div>
