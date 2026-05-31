<script lang="ts">
  import { proxiedImageUrl } from '$lib/utils/image';

  export let src: string;
  export let index: number;
  export let fit: 'width' | 'height' | 'screen' | 'original' = 'width';

  $: fitClass =
    fit === 'height'
      ? 'h-[calc(100vh-5rem)] w-auto'
      : fit === 'screen'
        ? 'max-h-[calc(100vh-5rem)] max-w-full object-contain'
        : fit === 'original'
          ? 'max-w-none'
          : 'w-full max-w-4xl';
</script>

<div class="flex min-h-64 w-full items-center justify-center">
  <img
    class="{fitClass} rounded-sm"
    src={proxiedImageUrl(src)}
    alt={`Page ${index + 1}`}
    loading={index < 3 ? 'eager' : 'lazy'}
  />
</div>
