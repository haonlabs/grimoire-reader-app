import { describe, expect, it } from 'vitest';
import { KomikuSource } from '../../src/lib/sources/komiku';
import { KomikcastSource } from '../../src/lib/sources/komikcast';
import { ShinigamiSource } from '../../src/lib/sources/shinigami';
import { parseCrotpediaListHtml } from '../../src/lib/sources/crotpedia';
import { decodeDoujinDesuResponse, DoujinDesuSource } from '../../src/lib/sources/doujindesu';

describe('Indonesian source adapters', () => {
  it('exposes the Komikcast API source identity', async () => {
    const source = new KomikcastSource();
    const filters = await source.getFilters();

    expect(source.id).toBe('komikcast');
    expect(source.baseUrl).toBe('https://v2.komikcast.fit');
    expect(filters.map((filter) => filter.id)).toEqual(['sort']);
  });

  it('exposes the Shinigami API source identity', async () => {
    const source = new ShinigamiSource();
    const filters = await source.getFilters();

    expect(source.id).toBe('shinigami');
    expect(source.baseUrl).toBe('https://g.shinigami.asia');
    expect(filters.map((filter) => filter.id)).toEqual(['sort']);
  });

  it('exposes the Komiku source identity', async () => {
    const source = new KomikuSource();
    const filters = await source.getFilters();

    expect(source.id).toBe('komiku');
    expect(source.baseUrl).toBe('https://komiku.org');
    expect(filters.map((filter) => filter.id)).toEqual(['sort']);
  });

  it('exposes the DoujinDesu API source identity and filters', async () => {
    const source = new DoujinDesuSource();
    const filters = await source.getFilters();

    expect(source.id).toBe('doujindesu');
    expect(source.baseUrl).toBe('https://doujin.desu.xxx');
    expect(source.contentRating).toBe('explicit');
    expect(filters.map((filter) => filter.id)).toEqual(['sort', 'type', 'status']);
  });

  it('accepts unencrypted DoujinDesu API responses', () => {
    expect(decodeDoujinDesuResponse('[{"slug":"example"}]')).toEqual([{ slug: 'example' }]);
  });

  it('parses CrotPedia series links when theme-specific card classes change', () => {
    const items = parseCrotpediaListHtml(`
      <main>
        <section class="latest-grid">
          <article class="new-card">
            <a href="/baca/series/amaama-ningyou/">
              <img data-src="/covers/amaama.jpg" alt="Amaama Ningyou">
            </a>
          </article>
          <a href="https://crotpedia.net/baca/series/partner/" title="Partner">Partner</a>
          <a href="/baca/series/amaama-ningyou/">duplicate</a>
        </section>
      </main>
    `);

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.title)).toEqual(['Amaama Ningyou', 'Partner']);
    expect(items[0].coverUrl).toBe('https://crotpedia.net/covers/amaama.jpg');
  });
});
