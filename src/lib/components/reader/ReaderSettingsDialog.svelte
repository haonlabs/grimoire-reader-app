<script lang="ts">
  import { createEventDispatcher, onDestroy, tick } from 'svelte';
  import {
    Check,
    Gauge,
    Maximize2,
    Monitor,
    Moon,
    Pause,
    Play,
    Scan,
    StretchVertical,
    Sun,
    X
  } from 'lucide-svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import type { FitMode, ReaderBackground } from '$lib/stores/settings';

  export let open = false;
  export let quality = 'high';
  export let fit: FitMode = 'width';
  export let background: ReaderBackground = 'black';
  export let speed = 2;
  export let autoScroll = false;

  const dispatch = createEventDispatcher<{
    close: void;
    qualityChange: string;
    fitChange: FitMode;
    backgroundChange: ReaderBackground;
    speedChange: number;
    autoScrollToggle: void;
  }>();

  let dialog: HTMLDialogElement;

  const fits = [
    { value: 'width' as const, label: 'Lebar', description: 'Isi selebar layar', icon: Maximize2 },
    { value: 'screen' as const, label: 'Layar', description: 'Satu layar penuh', icon: Scan },
    { value: 'height' as const, label: 'Tinggi', description: 'Ikuti tinggi layar', icon: StretchVertical },
    { value: 'original' as const, label: 'Asli', description: 'Ukuran sumber', icon: Monitor }
  ];

  const backgrounds = [
    { value: 'black' as const, label: 'Gelap', icon: Moon },
    { value: 'white' as const, label: 'Terang', icon: Sun },
    { value: 'sepia' as const, label: 'Sepia', icon: Monitor }
  ];

  $: if (dialog) {
    if (open && !dialog.open) void showDialog();
    if (!open && dialog.open) dialog.close();
  }

  async function showDialog() {
    dialog.showModal();
    await tick();
    dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
  }

  function requestClose() {
    dispatch('close');
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) requestClose();
  }

  function handleCancel(event: Event) {
    event.preventDefault();
    requestClose();
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (!open || event.key !== 'Escape') return;
    event.preventDefault();
    requestClose();
  }

  function handleQualityChange(event: Event) {
    quality = (event.target as HTMLSelectElement).value;
    dispatch('qualityChange', quality);
  }

  function handleSpeedChange(event: Event) {
    speed = Number((event.target as HTMLInputElement).value);
    dispatch('speedChange', speed);
  }

  onDestroy(() => {
    if (dialog?.open) dialog.close();
  });
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<dialog
  bind:this={dialog}
  class="reader-settings"
  aria-labelledby="reader-settings-title"
  on:cancel={handleCancel}
  on:close={() => {
    if (open) requestClose();
  }}
  on:click={handleBackdropClick}
>
  <div class="reader-settings__panel">
    <header class="reader-settings__header">
      <div class="reader-settings__intro">
        <div class="reader-settings__mark" aria-hidden="true"><Gauge size={20} /></div>
        <div>
          <h2 id="reader-settings-title">Pengaturan baca</h2>
          <p>Perubahan langsung diterapkan ke halaman.</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" title="Tutup pengaturan" aria-label="Tutup pengaturan" on:click={requestClose}>
        <X size={19} aria-hidden="true" />
      </Button>
    </header>

    <div class="reader-settings__grid">
      <section class="reader-settings__section reader-settings__section--fit" aria-labelledby="fit-heading">
        <div class="reader-settings__section-head">
          <h3 id="fit-heading">Ukuran halaman</h3>
          <p>Pilih bagaimana gambar mengisi ruang baca.</p>
        </div>
        <div class="reader-settings__choices reader-settings__choices--fit">
          {#each fits as item}
            <button
              class:reader-settings__choice--selected={fit === item.value}
              class="reader-settings__choice"
              type="button"
              aria-pressed={fit === item.value}
              aria-label={`${item.label} — ${item.description}`}
              on:click={() => dispatch('fitChange', item.value)}
            >
              <svelte:component this={item.icon} size={18} aria-hidden="true" />
              <strong>{item.label}</strong>
              {#if fit === item.value}<Check class="reader-settings__check" size={16} aria-hidden="true" />{/if}
            </button>
          {/each}
        </div>
      </section>

      <section class="reader-settings__section reader-settings__section--surface" aria-labelledby="surface-heading">
        <div class="reader-settings__section-head">
          <h3 id="surface-heading">Permukaan reader</h3>
          <p>Sesuaikan kualitas dan warna di belakang gambar.</p>
        </div>

        <label class="reader-settings__field">
          <span>Kualitas halaman</span>
          <Select data-initial-focus value={quality} on:change={handleQualityChange}>
            <option value="low">Rendah</option>
            <option value="medium">Sedang</option>
            <option value="high">Tinggi</option>
          </Select>
        </label>

        <div class="reader-settings__field">
          <span id="background-heading">Latar belakang</span>
          <div class="reader-settings__backgrounds" role="group" aria-labelledby="background-heading">
            {#each backgrounds as item}
              <button
                class:reader-settings__background--selected={background === item.value}
                class="reader-settings__background"
                type="button"
                aria-pressed={background === item.value}
                on:click={() => dispatch('backgroundChange', item.value)}
              >
                <svelte:component this={item.icon} size={17} aria-hidden="true" />
                <span>{item.label}</span>
                {#if background === item.value}<Check size={14} aria-hidden="true" />{/if}
              </button>
            {/each}
          </div>
        </div>
      </section>

      <section class="reader-settings__section reader-settings__section--scroll" aria-labelledby="scroll-heading">
        <div class="reader-settings__scroll-copy">
          <div class="reader-settings__section-head">
            <div class="reader-settings__scroll-title">
              <h3 id="scroll-heading">Autoscroll</h3>
              <Badge variant={autoScroll ? 'default' : 'outline'}>{autoScroll ? 'Berjalan' : 'Jeda'}</Badge>
            </div>
            <p>Atur kecepatan lalu mulai membaca tanpa menyentuh layar.</p>
          </div>
          <Button variant={autoScroll ? 'outline' : 'default'} on:click={() => dispatch('autoScrollToggle')}>
            {#if autoScroll}<Pause size={17} aria-hidden="true" /> Jeda{:else}<Play size={17} aria-hidden="true" /> Mulai{/if}
          </Button>
        </div>

        <label class="reader-settings__range">
          <span>Kecepatan</span>
          <input
            type="range"
            min="1"
            max="8"
            value={speed}
            aria-valuetext={`${speed} dari 8`}
            on:input={handleSpeedChange}
          />
          <output>{speed}<small>/8</small></output>
        </label>
      </section>
    </div>

    <footer class="reader-settings__footer">
      <p><Check size={15} aria-hidden="true" /> Tersimpan otomatis</p>
      <Button variant="secondary" on:click={requestClose}>Selesai</Button>
    </footer>
  </div>
</dialog>

<style>
  /* Hallmark · component: reader settings dialog · genre: atmospheric · theme: Midnight
   * states: default · hover · focus · active · disabled · selected · open · closed
   * contrast: pass (40–41) · responsive: pass (34, 49–57)
   */
  /* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */
  .reader-settings {
    position: fixed;
    inset: auto 0 0;
    width: min(100%, 46rem);
    max-width: none;
    max-height: 90dvh;
    margin: 0 auto;
    padding: 0;
    overflow: visible;
    border: 0;
    background: transparent;
    color: var(--color-ink);
  }

  .reader-settings::backdrop {
    background: color-mix(in oklch, var(--color-paper) 74%, transparent);
    animation: reader-settings-backdrop var(--dur-short) var(--ease-out);
  }

  .reader-settings__panel {
    display: grid;
    max-height: 90dvh;
    overflow: auto;
    border-radius: var(--radius-card) var(--radius-card) 0 0;
    background: var(--color-paper-2);
    color: var(--color-ink);
    animation: reader-settings-enter var(--dur-short) var(--ease-out);
  }

  .reader-settings__header,
  .reader-settings__intro,
  .reader-settings__scroll-copy,
  .reader-settings__scroll-title,
  .reader-settings__footer,
  .reader-settings__footer p {
    display: flex;
    align-items: center;
  }

  .reader-settings__header {
    justify-content: space-between;
    gap: var(--space-md);
    padding: var(--space-lg) var(--space-md) var(--space-xl);
    background: radial-gradient(circle at 12% 12%, var(--color-accent-soft), transparent 46%);
  }

  .reader-settings__intro {
    min-width: 0;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  .reader-settings__mark {
    display: grid;
    width: 2.75rem;
    height: 2.75rem;
    flex: 0 0 auto;
    place-items: center;
    border-radius: var(--radius-sm);
    background: var(--color-accent);
    color: var(--color-accent-ink);
  }

  h2,
  h3,
  p { margin: 0; }

  h2,
  h3 {
    color: var(--color-ink);
    font-family: var(--font-display);
    font-style: normal;
  }

  h2 {
    font-size: var(--text-xl);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1.1;
  }

  h3 {
    font-size: var(--text-base);
    font-weight: 700;
    line-height: 1.2;
  }

  .reader-settings__intro p,
  .reader-settings__section-head p {
    margin-block-start: var(--space-2xs);
    color: var(--color-muted);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  .reader-settings__grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .reader-settings__section {
    display: grid;
    min-width: 0;
    align-content: start;
    gap: var(--space-md);
    padding: var(--space-lg) var(--space-md);
  }

  .reader-settings__section--fit { background: var(--color-paper-3); color: var(--color-ink); }
  .reader-settings__section--surface { background: var(--color-paper-2); color: var(--color-ink); }
  .reader-settings__section--scroll { background: var(--color-paper-raised); color: var(--color-ink); }

  .reader-settings__choices {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-xs);
  }

  .reader-settings__choice,
  .reader-settings__background {
    min-height: 2.75rem;
    border: var(--rule-thin) solid var(--color-rule);
    border-radius: var(--radius-sm);
    background: var(--color-paper-raised);
    color: var(--color-ink-2);
    font-family: var(--font-body);
    transition:
      background-color var(--dur-short) var(--ease-out),
      color var(--dur-short) var(--ease-out),
      transform var(--dur-micro) var(--ease-out);
  }

  .reader-settings__choice {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm);
    text-align: start;
    white-space: nowrap;
  }

  .reader-settings__choice strong {
    color: inherit;
    font-size: var(--text-sm);
    line-height: 1;
  }

  .reader-settings__choice--selected,
  .reader-settings__background--selected {
    border-color: var(--color-accent);
    background: var(--color-accent-soft);
    color: var(--color-ink);
  }

  :global(.reader-settings__check) { color: var(--color-accent); }

  .reader-settings__choice:focus-visible,
  .reader-settings__background:focus-visible,
  .reader-settings__range input:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .reader-settings__choice:active,
  .reader-settings__background:active { transform: translateY(1px); }

  .reader-settings__range input:active { opacity: 0.86; }

  .reader-settings__choice:disabled,
  .reader-settings__background:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .reader-settings__range input:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .reader-settings__field {
    display: grid;
    gap: var(--space-xs);
    color: var(--color-ink-2);
    font-size: var(--text-sm);
    font-weight: 700;
  }

  .reader-settings__backgrounds {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-xs);
  }

  .reader-settings__background {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: center;
    gap: var(--space-2xs);
    padding-inline: var(--space-xs);
    font-size: var(--text-xs);
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
  }

  .reader-settings__scroll-copy {
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-md);
  }

  .reader-settings__scroll-title {
    gap: var(--space-xs);
  }

  .reader-settings__range {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-sm);
    color: var(--color-ink-2);
    font-size: var(--text-sm);
    font-weight: 700;
  }

  .reader-settings__range input {
    min-width: 0;
    min-height: 2.75rem;
    accent-color: var(--color-accent);
    cursor: pointer;
  }

  .reader-settings__range output {
    min-width: 2.75rem;
    color: var(--color-ink);
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    text-align: end;
  }

  .reader-settings__range output small {
    color: var(--color-muted);
    font-family: var(--font-body);
    font-size: var(--text-xs);
  }

  .reader-settings__footer {
    justify-content: space-between;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-md) max(var(--space-sm), env(safe-area-inset-bottom));
    background: var(--color-paper-2);
    color: var(--color-ink);
  }

  .reader-settings__footer p {
    gap: var(--space-2xs);
    color: var(--color-muted);
    font-size: var(--text-xs);
    line-height: 1;
  }

  @keyframes reader-settings-enter {
    from { opacity: 0; transform: translateY(var(--space-md)); }
    to { opacity: 1; transform: none; }
  }

  @keyframes reader-settings-backdrop {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (hover: hover) and (pointer: fine) {
    .reader-settings__choice:hover,
    .reader-settings__background:hover { background: var(--color-paper-3); color: var(--color-ink); }

    .reader-settings__choice--selected:hover,
    .reader-settings__background--selected:hover { background: var(--color-accent-soft); }
  }

  @media (min-width: 40rem) {
    .reader-settings {
      inset: 0;
      width: min(calc(100% - var(--space-xl)), 46rem);
      max-height: min(86dvh, 46rem);
      margin: auto;
    }

    .reader-settings__panel {
      max-height: min(86dvh, 46rem);
      border-radius: var(--radius-card);
    }

    .reader-settings__header {
      padding: var(--space-xl) var(--space-xl) var(--space-lg);
    }

    .reader-settings__grid {
      grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
    }

    .reader-settings__section { padding: var(--space-lg); }
    .reader-settings__section--scroll { grid-column: 1 / -1; }
    .reader-settings__footer { padding-inline: var(--space-lg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .reader-settings::backdrop,
    .reader-settings__panel { animation-duration: var(--dur-micro); animation-name: reader-settings-backdrop; }

    .reader-settings__choice,
    .reader-settings__background { transition: none; }

    .reader-settings__choice:active,
    .reader-settings__background:active { transform: none; }
  }
</style>
