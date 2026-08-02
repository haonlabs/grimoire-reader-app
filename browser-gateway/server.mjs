import { createServer } from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { chromium } from 'playwright';

const port = Number(process.env.PORT || 8787);
const token = process.env.GATEWAY_TOKEN?.trim();
const userDataDir = process.env.USER_DATA_DIR?.trim() || '/data/chromium-profile';
const headless = process.env.HEADLESS !== 'false';
const navigationTimeout = Number(process.env.NAVIGATION_TIMEOUT_MS || 60_000);
const challengeTimeout = Number(process.env.CHALLENGE_TIMEOUT_MS || 45_000);
const cdpUrl = process.env.CDP_URL?.trim();
const crotpediaUsername = process.env.CROTPEDIA_USERNAME?.trim();
const crotpediaPassword = process.env.CROTPEDIA_PASSWORD;
const browserTransport = process.env.BROWSER_TRANSPORT?.trim().toLowerCase() || 'auto';
const allowedHosts = new Set(['crotpedia.net', 'www.crotpedia.net', 'doujin.desu.xxx']);

if (!token || token.length < 32) {
  throw new Error('GATEWAY_TOKEN must contain at least 32 characters');
}

let contextPromise;
let connectedBrowser;
let loginPromise;
let extensionLastSeenAt = 0;
let extensionVersion = '';
const extensionJobs = [];
const extensionPolls = [];
const extensionResults = new Map();
const hiddenBrowserPages = new Map();
const hiddenRequestQueues = new Map();

async function connectToCdpBrowser(endpoint) {
  const resolvedEndpoint = new URL(endpoint);
  if (!isIP(resolvedEndpoint.hostname) && resolvedEndpoint.hostname !== 'localhost') {
    resolvedEndpoint.hostname = (await lookup(resolvedEndpoint.hostname)).address;
  }
  const versionUrl = new URL('/json/version', resolvedEndpoint);
  let response;
  try {
    response = await fetch(versionUrl);
  } catch (error) {
    throw new Error(`Dedicated browser is not ready at ${endpoint}`, { cause: error });
  }
  if (!response.ok) throw new Error(`Chrome DevTools endpoint returned HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload.webSocketDebuggerUrl) throw new Error('Chrome DevTools endpoint did not return a WebSocket URL');
  const browserSocket = new URL(payload.webSocketDebuggerUrl);
  browserSocket.hostname = resolvedEndpoint.hostname;
  return chromium.connectOverCDP(browserSocket.toString());
}

function resetBrowserConnection(browser) {
  if (browser && connectedBrowser && browser !== connectedBrowser) return;
  connectedBrowser = undefined;
  contextPromise = undefined;
  hiddenBrowserPages.clear();
  hiddenRequestQueues.clear();
}

function getContext() {
  if (contextPromise) return contextPromise;

  const attempt = cdpUrl
    ? connectToCdpBrowser(cdpUrl).then((browser) => {
        connectedBrowser = browser;
        browser.on('disconnected', () => resetBrowserConnection(browser));
        const context = browser.contexts()[0];
        if (!context) throw new Error('The connected Chrome browser has no default context');
        return context;
      })
    : chromium.launchPersistentContext(userDataDir, {
        headless,
        viewport: { width: 1365, height: 900 },
        locale: 'id-ID',
        timezoneId: 'Asia/Jakarta',
        args: [
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--dns-over-https-mode=secure',
          '--dns-over-https-templates=https://cloudflare-dns.com/dns-query',
          '--host-resolver-rules=MAP crotpedia.net 104.21.1.148, MAP www.crotpedia.net 104.21.1.148'
        ]
      });
  const recoverableAttempt = attempt.catch((error) => {
    if (contextPromise === recoverableAttempt) resetBrowserConnection();
    throw error;
  });
  contextPromise = recoverableAttempt;
  return contextPromise;
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff'
  });
  response.end(JSON.stringify(body));
}

function sendEmpty(response, status = 204) {
  response.writeHead(status, { 'cache-control': 'no-store' });
  response.end();
}

function authorized(request) {
  const header = request.headers.authorization || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  const expectedBuffer = Buffer.from(token);
  const suppliedBuffer = Buffer.from(supplied);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function validatedTarget(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || url.port || !allowedHosts.has(url.hostname.toLowerCase())) {
    throw new Error('Only HTTPS requests to configured Grimoire source hosts are allowed');
  }
  url.username = '';
  url.password = '';
  return url.toString();
}

function readJson(request, maxBytes = 32_768) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > maxBytes) reject(new Error('Request body too large'));
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    request.on('error', reject);
  });
}

function extensionIsConnected() {
  return Date.now() - extensionLastSeenAt < 35_000;
}

function safeRequestHeaders(rawHeaders) {
  if (!rawHeaders || typeof rawHeaders !== 'object' || Array.isArray(rawHeaders)) return {};
  const allowed = new Set(['accept', 'x-app-secret']);
  return Object.fromEntries(
    Object.entries(rawHeaders)
      .filter(([name, value]) => allowed.has(name.toLowerCase()) && typeof value === 'string' && value.length <= 512)
      .map(([name, value]) => [name, value])
  );
}

function dispatchExtensionJobs() {
  while (extensionJobs.length && extensionPolls.length) {
    const job = extensionJobs.shift();
    const poll = extensionPolls.shift();
    clearTimeout(poll.timer);
    sendJson(poll.response, 200, {
      job: { id: job.id, action: job.action, url: job.url, headers: job.headers }
    });
  }
}

function waitForExtensionPoll(request, response) {
  extensionLastSeenAt = Date.now();
  extensionVersion = request.headers['x-grimoire-extension-version']?.trim() || extensionVersion;
  if (extensionJobs.length) {
    const job = extensionJobs.shift();
    return sendJson(response, 200, {
      job: { id: job.id, action: job.action, url: job.url, headers: job.headers }
    });
  }
  const poll = { response, timer: undefined };
  poll.timer = setTimeout(() => {
    const index = extensionPolls.indexOf(poll);
    if (index >= 0) extensionPolls.splice(index, 1);
    sendEmpty(response);
  }, 25_000);
  extensionPolls.push(poll);
}

function fetchThroughExtension(url, headers, action = 'fetch') {
  const id = randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      extensionResults.delete(id);
      const queueIndex = extensionJobs.findIndex((job) => job.id === id);
      if (queueIndex >= 0) extensionJobs.splice(queueIndex, 1);
      reject(Object.assign(new Error('Browser extension did not return the source response in time'), { status: 504 }));
    }, 60_000);
    extensionResults.set(id, {
      action,
      resolve: (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      }
    });
    extensionJobs.push({ id, action, url, headers });
    dispatchExtensionJobs();
  });
}

function receiveExtensionResult(body) {
  const pending = extensionResults.get(body.id);
  if (!pending) return false;
  extensionResults.delete(body.id);
  if (body.error) {
    pending.reject(Object.assign(new Error(body.error), { status: Number(body.status) || 502 }));
    return true;
  }
  if (typeof body.html !== 'string') {
    pending.reject(Object.assign(new Error('Browser extension returned an invalid response'), { status: 502 }));
    return true;
  }
  pending.resolve({
    finalUrl: typeof body.finalUrl === 'string' ? body.finalUrl : '',
    html: body.html,
    status: Number(body.status) || 200,
    tabError: typeof body.tabError === 'string' ? body.tabError : '',
    via: typeof body.via === 'string' ? body.via : 'unknown'
  });
  console.log('[gateway] extension job completed', {
    action: pending.action,
    status: Number(body.status) || 200,
    via: typeof body.via === 'string' ? body.via : 'unknown'
  });
  return true;
}

async function isChallengePage(page) {
  const title = await page.title().catch(() => '');
  const body = await page.locator('body').innerText({ timeout: 2_000 }).catch(() => '');
  return /Just a moment|Tunggu sebentar|Melakukan verifikasi keamanan|Menunggu response|Attention Required|Enable JavaScript and cookies|challenge-platform/i.test(`${title}\n${body}`);
}

async function waitForChallenge(page) {
  const deadline = Date.now() + challengeTimeout;
  while ((await isChallengePage(page)) && Date.now() < deadline) {
    await page.waitForTimeout(1_000);
  }
  return !(await isChallengePage(page));
}

function nestedCdpChannel(browserSession, sessionId) {
  let sequence = 0;
  const pending = new Map();
  const onMessage = (event) => {
    if (event.sessionId !== sessionId) return;
    const message = JSON.parse(event.message);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message || 'Hidden browser command failed'));
    else waiter.resolve(message.result);
  };
  browserSession.on('Target.receivedMessageFromTarget', onMessage);

  return {
    send(method, params = {}) {
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Hidden browser command timed out: ${method}`));
        }, 30_000);
        pending.set(id, {
          resolve: (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          }
        });
        browserSession
          .send('Target.sendMessageToTarget', {
            sessionId,
            message: JSON.stringify({ id, method, params })
          })
          .catch((error) => {
            const waiter = pending.get(id);
            if (!waiter) return;
            pending.delete(id);
            waiter.reject(error);
          });
      });
    },
    dispose() {
      browserSession.off('Target.receivedMessageFromTarget', onMessage);
    }
  };
}

async function hiddenEvaluate(channel, expression) {
  const result = await channel.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Hidden browser evaluation failed');
  }
  return result.result?.value;
}

async function getHiddenBrowserPage(origin) {
  if (!hiddenBrowserPages.has(origin)) hiddenBrowserPages.set(origin, (async () => {
    if (!connectedBrowser) throw new Error('A connected Brave or Chrome browser is required for hidden mode');
    const browserSession = await connectedBrowser.newBrowserCDPSession();
    const { targetId } = await browserSession.send('Target.createTarget', {
      url: `${origin}/`,
      hidden: true,
      background: true
    });
    const { sessionId } = await browserSession.send('Target.attachToTarget', {
      targetId,
      flatten: false
    });
    const channel = nestedCdpChannel(browserSession, sessionId);
    await channel.send('Runtime.enable');
    await channel.send('Page.enable');
    await channel.send('Network.enable');

    const deadline = Date.now() + challengeTimeout;
    while (Date.now() < deadline) {
      const state = await hiddenEvaluate(
        channel,
        `({ ready: document.readyState, title: document.title, text: document.body?.innerText?.slice(0, 500) || '', url: location.href })`
      );
      const challenged = /Just a moment|Tunggu sebentar|Melakukan verifikasi keamanan|Enable JavaScript and cookies/i.test(
        `${state?.title || ''}\n${state?.text || ''}`
      );
      const reachedOrigin = (() => {
        try {
          return new URL(state?.url || '').origin === origin;
        } catch {
          return false;
        }
      })();
      if (reachedOrigin && state?.ready === 'complete' && !challenged) {
        return { browserSession, channel, targetId };
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    channel.dispose();
    await browserSession.send('Target.closeTarget', { targetId }).catch(() => {});
    throw Object.assign(new Error(`Hidden renderer did not clear browser verification for ${new URL(origin).hostname}`), {
      status: 403
    });
  })().catch((error) => {
    hiddenBrowserPages.delete(origin);
    throw error;
  }));
  return hiddenBrowserPages.get(origin);
}

async function fetchThroughHiddenBrowser(target, headers) {
  const origin = new URL(target).origin;
  const queue = hiddenRequestQueues.get(origin) || Promise.resolve();
  const request = queue.then(async () => {
    const { channel } = await getHiddenBrowserPage(origin);
    await channel.send('Network.setExtraHTTPHeaders', { headers });
    const navigation = await channel.send('Page.navigate', { url: target });
    if (navigation.errorText) throw new Error(`Hidden browser navigation failed: ${navigation.errorText}`);

    const deadline = Date.now() + navigationTimeout;
    while (Date.now() < deadline) {
      const state = await hiddenEvaluate(
        channel,
        `({
          ready: document.readyState,
          title: document.title,
          text: document.body?.innerText?.slice(0, 500) || '',
          url: location.href,
          html: document.documentElement?.outerHTML || '',
          bodyText: document.body?.innerText || '',
          contentType: document.contentType || '',
          status: performance.getEntriesByType('navigation')[0]?.responseStatus || 200
        })`
      );
      const challenged = /Just a moment|Tunggu sebentar|Melakukan verifikasi keamanan|Enable JavaScript and cookies/i.test(
        `${state?.title || ''}\n${state?.text || ''}`
      );
      const reachedOrigin = (() => {
        try {
          return new URL(state?.url || '').origin === origin;
        } catch {
          return false;
        }
      })();
      if (reachedOrigin && state?.ready === 'complete' && !challenged) {
        const loginPath = /\/(?:login|wp-login)(?:\/|\.php|$)/i.test(new URL(state.url).pathname);
        const loginGate = /Login terlebih dahulu(?: untuk melihat)?/i.test(state.html);
        if (loginPath || loginGate) {
          throw Object.assign(new Error(`${new URL(origin).hostname} login expired. Open and login once in the dedicated browser profile.`), {
            status: 401
          });
        }
        const responseBody = /application\/json/i.test(state.contentType) ? state.bodyText : state.html;
        return { finalUrl: state.url, html: responseBody, status: Number(state.status) || 200 };
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw Object.assign(new Error(`Hidden navigation for ${new URL(origin).hostname} did not finish before timeout`), {
      status: 504
    });
  });
  hiddenRequestQueues.set(origin, request.catch(() => {}));
  return request;
}

async function fetchThroughConnectedBrowser(context, target, headers) {
  const targetOrigin = new URL(target).origin;
  let page = context.pages().find((candidate) => {
    try {
      return new URL(candidate.url()).origin === targetOrigin;
    } catch {
      return false;
    }
  });

  if (!page) {
    page = await context.newPage();
    await page.goto(targetOrigin, { waitUntil: 'domcontentloaded' });
    if (!(await waitForChallenge(page))) {
      throw Object.assign(new Error(`The connected browser still requires verification for ${new URL(targetOrigin).hostname}`), {
        status: 403
      });
    }
  }

  const fetchInPage = () => page.evaluate(async ({ url, headers }) => {
    const response = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'text/html,application/xhtml+xml,application/json,*/*', ...headers },
      redirect: 'follow'
    });
    return {
      finalUrl: response.url,
      html: await response.text(),
      status: response.status
    };
  }, { url: target, headers });

  let result = await fetchInPage();
  const loginPath = /\/(?:login|wp-login)(?:\/|\.php|$)/i.test(new URL(result.finalUrl).pathname);
  const loginGate = /Login terlebih dahulu(?: untuk melihat)?/i.test(result.html);
  if (loginPath || loginGate) {
    await loginToCrotpedia(page, targetOrigin);
    result = await fetchInPage();
  }
  return result;
}

async function loginToCrotpedia(page, origin) {
  if (!crotpediaUsername || !crotpediaPassword) {
    throw Object.assign(new Error('CrotPedia login is required but gateway credentials are not configured'), {
      status: 401
    });
  }
  loginPromise ??= (async () => {
    await page.goto(`${origin}/login/`, { waitUntil: 'domcontentloaded' });
    const username = page
      .locator('input[type="email"], input[name="log"], input[name="email"], input[name="username"]')
      .first();
    const password = page.locator('input[type="password"]').first();
    const submit = page.locator('button[type="submit"], input[type="submit"]').first();
    if (!(await username.count()) || !(await password.count()) || !(await submit.count())) {
      throw Object.assign(new Error('CrotPedia login form was not recognized'), { status: 502 });
    }
    await username.fill(crotpediaUsername);
    await password.fill(crotpediaPassword);
    await submit.click();
    await page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(1_000);
    if (await page.locator('input[type="password"]').count()) {
      throw Object.assign(new Error('CrotPedia rejected the configured login'), { status: 401 });
    }
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
  })().finally(() => {
    loginPromise = undefined;
  });
  return loginPromise;
}

async function restoreCrotpediaLogin(context, origin) {
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(navigationTimeout);
  try {
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    if (!(await waitForChallenge(page))) {
      throw Object.assign(new Error('CrotPedia still requires browser verification'), { status: 403 });
    }
    await loginToCrotpedia(page, origin);
  } finally {
    await page.close();
  }
}

async function fetchPage(rawUrl, rawHeaders = {}) {
  const target = validatedTarget(rawUrl);
  const headers = safeRequestHeaders(rawHeaders);
  if (browserTransport === 'extension' || (browserTransport === 'auto' && extensionIsConnected())) {
    if (!extensionIsConnected()) {
      throw Object.assign(new Error('Grimoire browser extension is not connected to the local gateway'), {
        status: 503
      });
    }
    return fetchThroughExtension(target, headers);
  }
  const context = await getContext();
  if (browserTransport === 'hidden') {
    try {
      return await fetchThroughHiddenBrowser(target, headers);
    } catch (error) {
      const isCrotpedia = ['crotpedia.net', 'www.crotpedia.net'].includes(new URL(target).hostname.toLowerCase());
      if (Number(error?.status) !== 401 || !isCrotpedia || !crotpediaUsername || !crotpediaPassword) throw error;
      await restoreCrotpediaLogin(context, new URL(target).origin);
      return fetchThroughHiddenBrowser(target, headers);
    }
  }
  if (connectedBrowser) return fetchThroughConnectedBrowser(context, target, headers);

  const page = await context.newPage();
  page.setDefaultNavigationTimeout(navigationTimeout);
  await page.setExtraHTTPHeaders(headers);

  try {
    const navigation = await page.goto(target, { waitUntil: 'domcontentloaded' });
    const challengePassed = await waitForChallenge(page);
    if (!challengePassed) {
      throw Object.assign(new Error('Browser challenge did not complete before timeout'), { status: 403 });
    }
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
    const finalStatus = navigation?.status() || 200;
    if (finalStatus >= 400 && page.url() === target) {
      throw Object.assign(new Error(`${new URL(target).hostname} returned HTTP ${finalStatus} in browser`), {
        status: finalStatus
      });
    }
    return {
      finalUrl: page.url(),
      html: await page.content(),
      status: finalStatus
    };
  } finally {
    await page.close();
  }
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://gateway.local');
  if (request.method === 'GET' && request.url === '/health') {
    return sendJson(response, 200, {
      ok: true,
      extensionConnected: extensionIsConnected(),
      extensionVersion: extensionVersion || null,
      transport: browserTransport
    });
  }
  if (request.method === 'GET' && requestUrl.pathname === '/v1/extension/poll') {
    if (!authorized(request)) return sendJson(response, 401, { error: 'Unauthorized' });
    return waitForExtensionPoll(request, response);
  }
  if (request.method === 'POST' && requestUrl.pathname === '/v1/extension/result') {
    if (!authorized(request)) return sendJson(response, 401, { error: 'Unauthorized' });
    try {
      const body = await readJson(request, 12 * 1024 * 1024);
      extensionLastSeenAt = Date.now();
      extensionVersion = request.headers['x-grimoire-extension-version']?.trim() || extensionVersion;
      return receiveExtensionResult(body)
        ? sendJson(response, 200, { ok: true })
        : sendJson(response, 404, { error: 'Extension job is no longer pending' });
    } catch (error) {
      return sendJson(response, 400, { error: error instanceof Error ? error.message : 'Invalid result' });
    }
  }
  if (request.method === 'POST' && requestUrl.pathname === '/v1/extension/open') {
    if (!authorized(request)) return sendJson(response, 401, { error: 'Unauthorized' });
    if (!extensionIsConnected()) {
      return sendJson(response, 503, { error: 'Grimoire browser extension is not connected to the local gateway' });
    }
    try {
      const body = await readJson(request);
      const target = validatedTarget(body.url);
      const result = await fetchThroughExtension(target, {}, 'open');
      return sendJson(response, 200, {
        ok: true,
        handled: result.html === '' && Number(result.status) === 200
      });
    } catch (error) {
      const status = Number(error?.status) || 502;
      return sendJson(response, status, { error: error instanceof Error ? error.message : 'Unable to open source tab' });
    }
  }
  if (request.method === 'POST' && requestUrl.pathname === '/v1/extension/close') {
    if (!authorized(request)) return sendJson(response, 401, { error: 'Unauthorized' });
    if (!extensionIsConnected()) {
      return sendJson(response, 503, { error: 'Grimoire browser extension is not connected to the local gateway' });
    }
    try {
      const body = await readJson(request);
      const target = validatedTarget(body.url);
      const result = await fetchThroughExtension(target, {}, 'close');
      return sendJson(response, 200, {
        ok: true,
        handled: result.html === '' && Number(result.status) === 200
      });
    } catch (error) {
      const status = Number(error?.status) || 502;
      return sendJson(response, status, { error: error instanceof Error ? error.message : 'Unable to close source tabs' });
    }
  }
  if (request.method !== 'POST' || request.url !== '/v1/fetch') {
    return sendJson(response, 404, { error: 'Not found' });
  }
  if (!authorized(request)) {
    return sendJson(response, 401, { error: 'Unauthorized' });
  }

  try {
    const body = await readJson(request);
    const result = await fetchPage(body.url, body.headers);
    return sendJson(response, 200, result);
  } catch (error) {
    const status = Number(error?.status) || 502;
    return sendJson(response, status, { error: error instanceof Error ? error.message : 'Browser fetch failed' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Grimoire browser gateway listening on port ${port}`);
});

async function shutdown() {
  server.close();
  if (contextPromise && !connectedBrowser) await (await contextPromise).close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
