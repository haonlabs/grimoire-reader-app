<script lang="ts">
  export let orientation: 'horizontal' | 'vertical' = 'horizontal';
</script>

<div
  {...$$restProps}
  class="separator separator--{orientation} {$$props.class ?? ''}"
  role="separator"
  aria-orientation={orientation}
></div>

<style>
  /* Hallmark · component: separator · genre: atmospheric · theme: Midnight */
  .separator { flex-shrink: 0; background: var(--color-rule); }
  .separator--horizontal { width: 100%; height: var(--rule-thin); }
  .separator--vertical { width: var(--rule-thin); height: 100%; }
</style>
