import { describe, expect, it } from 'vitest';
import { browserInteractionRequired } from '../../browser-extension/source-response.js';

describe('browser extension source response routing', () => {
  it('keeps a normal source response in the background', () => {
    expect(
      browserInteractionRequired(
        200,
        'https://crotpedia.net/baca/series/example/',
        '<html><title>Example</title><a href="/baca/chapter/example-1">Chapter 1</a></html>'
      )
    ).toBe(false);
  });

  it.each([
    [403, 'https://crotpedia.net/', '<html>Forbidden</html>'],
    [200, 'https://crotpedia.net/', '<title>Just a moment...</title>'],
    [200, 'https://crotpedia.net/', '<script src="/challenge-platform/test.js"></script>'],
    [200, 'https://crotpedia.net/login/', '<form><input type="password"></form>'],
    [200, 'https://crotpedia.net/login/', '<html>Login</html>']
  ])('falls back to browser interaction only when needed', (status, url, html) => {
    expect(browserInteractionRequired(status, url, html)).toBe(true);
  });
});
