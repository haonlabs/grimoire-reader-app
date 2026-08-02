import { describe, expect, it } from 'vitest';
import { isPrivateNetworkHostname } from '../../src/lib/server/localNetwork';

describe('local bridge network access', () => {
  it.each([
    'localhost',
    '127.0.0.1',
    '10.0.0.8',
    '172.16.0.4',
    '172.31.255.254',
    '192.168.1.20',
    '169.254.10.2',
    'grimoire-mac.local',
    '[::1]',
    '[fd12:3456::1]',
    '[fe80::1234]',
    '[::ffff:192.168.1.20]'
  ])('accepts a trusted local hostname: %s', (hostname) => {
    expect(isPrivateNetworkHostname(hostname)).toBe(true);
  });

  it.each([
    '8.8.8.8',
    '172.15.255.255',
    '172.32.0.1',
    '192.167.1.20',
    '192.168.1.20.example.com',
    'example.com',
    '[2001:db8::1]'
  ])('rejects a public or misleading hostname: %s', (hostname) => {
    expect(isPrivateNetworkHostname(hostname)).toBe(false);
  });
});
