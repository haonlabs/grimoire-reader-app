/**
 * @param {number} status
 * @param {string} finalUrl
 * @param {string} html
 */
export function browserInteractionRequired(status, finalUrl, html) {
  if (status >= 400) return true;
  if (/just a moment|tunggu sebentar|verifikasi keamanan|challenge-platform|enable javascript and cookies/i.test(html)) {
    return true;
  }
  if (/login terlebih dahulu|masuk terlebih dahulu|<input[^>]+type=["']password/i.test(html)) {
    return true;
  }

  try {
    const requested = new URL(finalUrl);
    return /\/login\/?$/i.test(requested.pathname);
  } catch {
    return true;
  }
}
