<script lang="ts">
  import { ArrowLeft, ChevronLeft, ChevronRight, Settings } from 'lucide-svelte';
  import ProgressBar from './ProgressBar.svelte';

  export let visible = true;
  export let mangaTitle = 'Reader';
  export let chapterTitle = '';
  export let page = 0;
  export let total = 0;
  export let previous = () => {};
  export let next = () => {};

  function back() {
    history.back();
  }
</script>

{#if visible}
  <div class="pointer-events-none fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-black/80 to-transparent p-3 text-white">
    <div class="pointer-events-auto flex items-center gap-3">
      <button class="focus-ring rounded-full bg-white/10 p-2 backdrop-blur" type="button" title="Back" on:click={back}>
        <ArrowLeft size={20} />
      </button>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold">{mangaTitle}</p>
        <p class="truncate text-xs text-white/65">{chapterTitle}</p>
      </div>
      <button class="focus-ring rounded-full bg-white/10 p-2 backdrop-blur" type="button" title="Reader settings">
        <Settings size={20} />
      </button>
    </div>
  </div>

  <div class="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 to-transparent p-3 text-white">
    <div class="pointer-events-auto mx-auto grid max-w-4xl grid-cols-[auto_1fr_auto] items-center gap-3">
      <button class="focus-ring rounded-full bg-white/10 p-2 backdrop-blur" type="button" title="Previous page" on:click={previous}>
        <ChevronLeft size={20} />
      </button>
      <ProgressBar bind:page {total} />
      <button class="focus-ring rounded-full bg-white/10 p-2 backdrop-blur" type="button" title="Next page" on:click={next}>
        <ChevronRight size={20} />
      </button>
    </div>
  </div>
{/if}
