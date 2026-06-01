<script lang="ts">
  import { Search } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import Input from '$lib/components/ui/Input.svelte';

  export let activeSource = 'mangadex';
  let query = '';

  function submit() {
    const params = new URLSearchParams({ q: query, mode: 'active', source: activeSource });
    goto(`/search?${params.toString()}`);
  }
</script>

<form class="relative flex min-w-0 flex-1 items-center" on:submit|preventDefault={submit}>
  <Search class="pointer-events-none absolute left-3 text-white/45" size={18} />
  <Input
    class="h-11 bg-[#151518] pl-10"
    bind:value={query}
    placeholder="Cari komik"
  />
</form>
