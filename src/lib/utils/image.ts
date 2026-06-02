export function proxiedImageUrl(url?: string) {
  if (!url) return '';
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

export function preloadImages(urls: Array<string | null | undefined>) {
  if (typeof window === 'undefined') return () => {};

  const controller = new AbortController();
  const proxiedUrls = [
    ...new Set(urls.map((url) => proxiedImageUrl(url ?? '')).filter(Boolean))
  ];
  const concurrency = 4;
  let cursor = 0;

  const loadNext = () => {
    if (controller.signal.aborted) return;
    const url = proxiedUrls[cursor];
    cursor += 1;
    if (!url) return;
    fetch(url, {
      cache: 'force-cache',
      signal: controller.signal
    })
      .catch(() => {
        // The visible img elements still own the user-facing error state.
      })
      .finally(loadNext);
  };

  window.setTimeout(() => {
    for (let index = 0; index < Math.min(concurrency, proxiedUrls.length); index += 1) {
      loadNext();
    }
  }, 0);

  return () => controller.abort();
}
