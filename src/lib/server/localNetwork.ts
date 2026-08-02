const LOCAL_NAMES = new Set(['localhost', '0.0.0.0', '127.0.0.1', '::1']);

function normalizedHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '').split('%')[0];
}

function privateIpv4(hostname: string) {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function privateIpv6(hostname: string) {
  if (hostname === '::1') return true;
  if (hostname.startsWith('::ffff:')) return privateIpv4(hostname.slice('::ffff:'.length));

  const firstGroup = hostname.split(':', 1)[0];
  const firstValue = Number.parseInt(firstGroup, 16);
  if (!Number.isFinite(firstValue)) return false;

  return (firstValue & 0xfe00) === 0xfc00 || (firstValue & 0xffc0) === 0xfe80;
}

export function isPrivateNetworkHostname(value: string) {
  const hostname = normalizedHostname(value);
  if (LOCAL_NAMES.has(hostname)) return true;
  if (/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.local$/.test(hostname)) return true;
  if (privateIpv4(hostname)) return true;
  return hostname.includes(':') && privateIpv6(hostname);
}
