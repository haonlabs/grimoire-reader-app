export function proxiedImageUrl(url?: string) {
  if (!url) return '';
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}
