<script lang="ts">
  export let value = '';
  export let type = 'text';
  export let placeholder = '';
  export let disabled = false;
</script>

<input
  {...$$restProps}
  bind:value
  {type}
  {placeholder}
  {disabled}
  on:input
  on:change
  class="focus-ring flex h-10 w-full rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 {$$props.class ?? ''}"
/>
