<script lang="ts">
  import { CheckCircle2, Download, ExternalLink, Puzzle, ShieldCheck } from 'lucide-svelte';
  import Card from '$lib/components/ui/Card.svelte';
</script>

<svelte:head>
  <title>Browser Extension · Grimoire Reader</title>
</svelte:head>

<section class="mx-auto max-w-4xl">
  <Card class="overflow-hidden p-0">
    <div class="border-b border-white/10 bg-gradient-to-br from-violet-600/25 via-[#141416] to-[#141416] p-6 sm:p-8">
      <div class="grid h-12 w-12 place-items-center rounded-xl bg-violet-600 text-white shadow-soft">
        <Puzzle size={25} />
      </div>
      <p class="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-violet-300">Local browser bridge</p>
      <h1 class="mt-2 text-3xl font-extrabold text-white sm:text-4xl">Protected Source Extension</h1>
      <p class="mt-3 max-w-2xl text-sm leading-7 text-white/65">
        Pair your verified Brave or Chrome profile with Grimoire's hidden browser renderer—without keeping permanent CrotPedia or DoujinDesu tabs open.
      </p>
      <a
        class="focus-ring mt-6 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-500"
        href="/downloads/grimoire-protected-source-extension.zip"
        download
      >
        <Download size={18} />
        Download extension
      </a>
    </div>

    <div class="grid gap-6 p-6 sm:p-8">
      <section>
        <h2 class="text-lg font-bold text-white">Install in Brave or Chrome</h2>
        <ol class="mt-4 grid gap-3 text-sm leading-6 text-white/65">
          <li class="flex gap-3"><span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-500/20 font-bold text-violet-200">1</span><span>Download and extract the ZIP file.</span></li>
          <li class="flex gap-3"><span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-500/20 font-bold text-violet-200">2</span><span>Open <code class="rounded bg-white/10 px-1.5 py-1 text-white">brave://extensions</code> or <code class="rounded bg-white/10 px-1.5 py-1 text-white">chrome://extensions</code>.</span></li>
          <li class="flex gap-3"><span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-500/20 font-bold text-violet-200">3</span><span>Enable Developer mode, choose <strong class="text-white">Load unpacked</strong>, then select the extracted folder.</span></li>
          <li class="flex gap-3"><span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-500/20 font-bold text-violet-200">4</span><span>Open the extension settings and paste the <code class="rounded bg-white/10 px-1.5 py-1 text-white">GATEWAY_TOKEN</code> from <code class="rounded bg-white/10 px-1.5 py-1 text-white">browser-gateway/.env</code>.</span></li>
        </ol>
      </section>

      <section class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-white/10 bg-black/20 p-4">
          <ShieldCheck class="text-emerald-300" size={21} />
          <h3 class="mt-3 font-bold text-white">Restricted access</h3>
          <p class="mt-1 text-sm leading-6 text-white/55">The extension can access only CrotPedia, DoujinDesu, and the gateway running on localhost.</p>
        </div>
        <div class="rounded-lg border border-white/10 bg-black/20 p-4">
          <CheckCircle2 class="text-violet-300" size={21} />
          <h3 class="mt-3 font-bold text-white">No permanent tab</h3>
          <p class="mt-1 text-sm leading-6 text-white/55">After first-time verification or login, close the source tab. Requests continue through the gateway's invisible full-page renderer.</p>
        </div>
      </section>

      <section class="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
        <strong>First-time setup:</strong> keep OrbStack and the browser gateway running. If a source shows a Cloudflare challenge, open that source once in the dedicated browser, finish verification, then close the tab. CrotPedia also requires login.
      </section>

      <a class="inline-flex w-fit items-center gap-2 text-sm font-bold text-violet-300 hover:text-violet-200" href="/sources">
        Return to Source Manager
        <ExternalLink size={16} />
      </a>
    </div>
  </Card>
</section>
