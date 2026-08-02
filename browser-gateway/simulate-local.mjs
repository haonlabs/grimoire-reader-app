import { lookup } from 'node:dns/promises';
import { chromium } from 'playwright';

const endpoint = new URL(process.env.CDP_URL || 'http://host.docker.internal:9222');
endpoint.hostname = (await lookup(endpoint.hostname)).address;
const version = await fetch(new URL('/json/version', endpoint)).then((response) => response.json());
const socket = new URL(version.webSocketDebuggerUrl);
socket.hostname = endpoint.hostname;
const browser = await chromium.connectOverCDP(socket.toString());
const context = browser.contexts()[0];
const page = await context.newPage();
const failedApi = [];
const consoleErrors = [];

page.on('response', async (response) => {
  if (response.url().includes('/api/') && response.status() >= 400) {
    failedApi.push({ status: response.status(), url: response.url(), body: await response.text().catch(() => '') });
  }
});
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto('http://127.0.0.1:5174/explore', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('manga_sources_enabled', JSON.stringify(['shinigami', 'crotpedia']));
    localStorage.setItem(
      'manga_settings',
      JSON.stringify({
        theme: 'dark',
        uiLanguage: 'id',
        defaultSourceId: 'shinigami',
        defaultContentRating: 'explicit',
        adultModeEnabled: true,
        reader: {
          mode: 'vertical',
          fit: 'width',
          background: 'black',
          preloadPages: 3,
          showPageNumber: false,
          incognito: false
        }
      })
    );
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });

  const sourceSelect = page.locator('select').first();
  await sourceSelect.selectOption('crotpedia');
  await page.waitForTimeout(4_000);

  const mangaLink = page.locator('a[href^="/manga/crotpedia/"]').first();
  await mangaLink.waitFor({ state: 'visible', timeout: 30_000 });
  const mangaHref = await mangaLink.getAttribute('href');
  await mangaLink.click();
  await page.waitForURL(/\/manga\/crotpedia\//, { timeout: 30_000 });
  await page.waitForTimeout(2_000);

  const currentPath = new URL(page.url()).pathname;
  const chapterLinks = page.locator('a[href^="/manga/crotpedia/"]');
  let chapterHref = '';
  for (let index = 0; index < (await chapterLinks.count()); index += 1) {
    const href = (await chapterLinks.nth(index).getAttribute('href')) || '';
    if (href !== currentPath && href.split('/').filter(Boolean).length >= 4) {
      chapterHref = href;
      break;
    }
  }
  if (!chapterHref) throw new Error('No chapter link was rendered on the manga page');
  await page.goto(new URL(chapterHref, page.url()).toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5_000);

  const bodyText = await page.locator('body').innerText();
  const readerImageLocator = page.locator('main img, [class*="reader"] img');
  const readerImages = await readerImageLocator.count();
  const loadedReaderImages = await readerImageLocator.evaluateAll((images) =>
    images.filter((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0).length
  );
  console.log(
    JSON.stringify(
      {
        mangaHref,
        chapterHref,
        finalUrl: page.url(),
        title: await page.title(),
        readerImages,
        loadedReaderImages,
        visibleError: /Reader failed|Unable to load|Source.*blocked|challenge browser/i.test(bodyText)
          ? bodyText.slice(0, 800)
          : '',
        failedApi,
        consoleErrors
      },
      null,
      2
    )
  );
} finally {
  await page.close();
}
