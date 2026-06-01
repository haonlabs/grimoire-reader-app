<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { proxiedImageUrl } from '$lib/utils/image';
  import SkeletonProgress from '$lib/components/ui/SkeletonProgress.svelte';

  export let src: string;
  export let index: number;
  export let fit: 'width' | 'height' | 'screen' | 'original' = 'width';
  export let progress: number | undefined = undefined;

  const dispatch = createEventDispatcher<{ load: { index: number }; error: { index: number } }>();
  let loaded = false;
  let failed = false;
  let currentSrc = '';

  $: fitClass =
    fit === 'height'
      ? 'h-[calc(100vh-5rem)] w-auto'
      : fit === 'screen'
        ? 'max-h-[calc(100vh-5rem)] max-w-full object-contain'
        : fit === 'original'
          ? 'max-w-none'
          : 'w-full max-w-4xl';

  $: if (src !== currentSrc) {
    currentSrc = src;
    loaded = false;
    failed = false;
  }

  function handleLoad() {
    loaded = true;
    dispatch('load', { index });
  }

  function handleError() {
    failed = true;
    dispatch('error', { index });
  }
</script>

<div class="relative flex min-h-64 w-full items-center justify-center">
  {#if !loaded && !failed}
    <div class="relative my-1 h-[72vh] w-full max-w-4xl overflow-hidden rounded-sm bg-white/10">
      <div class="absolute inset-0 shimmer" aria-label={`Loading page ${index + 1}`}></div>
      <div class="absolute left-1/2 top-1/2 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2">
        <SkeletonProgress label="Memuat halaman" value={progress} />
      </div>
    </div>
  {/if}
  <img
    class="{fitClass} rounded-sm transition-opacity duration-200 {loaded ? 'opacity-100' : 'absolute opacity-0'}"
    src={proxiedImageUrl(src)}
    alt={`Page ${index + 1}`}
    loading={index < 3 ? 'eager' : 'lazy'}
    on:load={handleLoad}
    on:error={handleError}
  />
  {#if failed}
    <div class="my-1 grid min-h-64 w-full max-w-4xl place-items-center rounded-sm border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
      Page {index + 1} gagal dimuat.
    </div>
  {/if}
</div>
