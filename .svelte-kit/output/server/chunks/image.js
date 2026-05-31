function proxiedImageUrl(url) {
  if (!url) return "";
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}
export {
  proxiedImageUrl as p
};
