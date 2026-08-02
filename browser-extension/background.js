const DEFAULT_GATEWAY_URL = 'http://127.0.0.1:8787';
const EXTENSION_VERSION = chrome.runtime.getManifest().version;
let activePoll;
let launcherToken = '';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function config() {
  const stored = await chrome.storage.local.get(['gatewayUrl', 'gatewayToken']);
  return {
    gatewayUrl: (stored.gatewayUrl || DEFAULT_GATEWAY_URL).replace(/\/$/, ''),
    gatewayToken: (launcherToken || stored.gatewayToken || '').trim()
  };
}

function authorization(token) {
  return {
    Authorization: `Bearer ${token}`,
    'X-Grimoire-Extension-Version': EXTENSION_VERSION
  };
}

function sourceTabPatterns(rawUrl) {
  const target = new URL(rawUrl);
  const patterns = [`${target.origin}/*`];
  if (target.hostname === 'crotpedia.net') patterns.push('https://www.crotpedia.net/*');
  if (target.hostname === 'www.crotpedia.net') patterns.push('https://crotpedia.net/*');
  return patterns;
}

function preferredSourceTab(tabs) {
  return [...tabs]
    .filter((tab) => typeof tab.id === 'number')
    .sort((left, right) => {
      const score = (tab) => {
        const challenged = /just a moment|tunggu sebentar|verifikasi keamanan/i.test(tab.title || '');
        return (challenged ? -100 : 0) + (tab.status === 'complete' ? 10 : 0) + (tab.active ? 1 : 0);
      };
      return score(right) - score(left);
    })[0];
}

async function fetchThroughSourceTab(job) {
  const matchingTabs = await chrome.tabs.query({ url: sourceTabPatterns(job.url) });
  const sourceTab = preferredSourceTab(matchingTabs);
  if (sourceTab?.id === undefined) return { error: 'source tab not found', result: null };

  try {
    const currentUrl = sourceTab.url ? new URL(sourceTab.url) : null;
    const targetUrl = new URL(job.url);
    if (currentUrl?.href !== targetUrl.href) {
      await chrome.tabs.update(sourceTab.id, { url: targetUrl.href, active: false });
      const deadline = Date.now() + 45_000;
      while (Date.now() < deadline) {
        const tab = await chrome.tabs.get(sourceTab.id);
        if (tab.status === 'complete') break;
        await delay(250);
      }
    }

    let snapshot = null;
    let snapshotError = '';
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        snapshot = await chrome.tabs.sendMessage(sourceTab.id, { type: 'grimoireSnapshot' });
        if (snapshot?.html) break;
      } catch (error) {
        snapshotError = error instanceof Error ? error.message : 'source snapshot unavailable';
      }
      await delay(500);
    }
    if (!snapshot?.html) throw new Error(snapshotError || 'source snapshot unavailable');
    return { error: '', result: snapshot };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'tab execution failed', result: null };
  }
}

async function completeJob(settings, job) {
  let result;
  try {
    const tabExecution = await fetchThroughSourceTab(job);
    if (tabExecution.result) {
      result = { id: job.id, ...tabExecution.result, via: 'tab' };
    } else {
      const response = await fetch(job.url, {
        credentials: 'include',
        redirect: 'follow',
        cache: 'no-store',
        headers: { Accept: 'text/html,application/xhtml+xml,application/json,*/*', ...(job.headers || {}) }
      });
      result = {
        id: job.id,
        finalUrl: response.url,
        html: await response.text(),
        status: response.status,
        tabError: tabExecution.error,
        via: 'background'
      };
    }
  } catch (error) {
    result = {
      id: job.id,
      error: error instanceof Error ? error.message : 'Extension fetch failed',
      status: 502
    };
  }

  await fetch(`${settings.gatewayUrl}/v1/extension/result`, {
    method: 'POST',
    headers: {
      ...authorization(settings.gatewayToken),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(result)
  });
}

async function focusOrOpenSourceTab(settings, job) {
  let result;
  try {
    const matchingTabs = await chrome.tabs.query({ url: sourceTabPatterns(job.url) });
    const existingTab = preferredSourceTab(matchingTabs);

    if (existingTab?.id !== undefined) {
      await chrome.tabs.update(existingTab.id, { active: true });
      if (existingTab.windowId !== undefined) {
        await chrome.windows.update(existingTab.windowId, { focused: true, state: 'normal' });
      }
    } else {
      await chrome.tabs.create({ url: job.url, active: true });
    }
    result = { id: job.id, finalUrl: job.url, html: '', status: 200, via: 'tab-control' };
  } catch (error) {
    result = {
      id: job.id,
      error: error instanceof Error ? error.message : 'Unable to open source tab',
      status: 502
    };
  }

  await fetch(`${settings.gatewayUrl}/v1/extension/result`, {
    method: 'POST',
    headers: {
      ...authorization(settings.gatewayToken),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(result)
  });
}

async function closeSourceTabs(settings, job) {
  let result;
  try {
    const matchingTabs = await chrome.tabs.query({ url: sourceTabPatterns(job.url) });
    const sourceTabs = matchingTabs.filter((tab) => typeof tab.id === 'number');
    const keeper = preferredSourceTab(sourceTabs);
    const duplicateIds = sourceTabs.flatMap((tab) =>
      typeof tab.id === 'number' && tab.id !== keeper?.id ? [tab.id] : []
    );
    if (duplicateIds.length) await chrome.tabs.remove(duplicateIds);

    if (keeper?.id !== undefined) {
      const currentWindow = keeper.windowId === undefined ? null : await chrome.windows.get(keeper.windowId);
      if (currentWindow?.type !== 'popup' || currentWindow.state !== 'minimized') {
        const helperWindow = await chrome.windows.create({
          tabId: keeper.id,
          type: 'popup',
          focused: false
        });
        if (helperWindow?.id !== undefined) {
          await chrome.windows.update(helperWindow.id, { focused: false, state: 'minimized' });
        }
      }
    }
    result = { id: job.id, finalUrl: job.url, html: '', status: 200, via: 'tab-control' };
  } catch (error) {
    result = {
      id: job.id,
      error: error instanceof Error ? error.message : 'Unable to close source tabs',
      status: 502
    };
  }

  await fetch(`${settings.gatewayUrl}/v1/extension/result`, {
    method: 'POST',
    headers: {
      ...authorization(settings.gatewayToken),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(result)
  });
}

async function cleanRestoredHelperTabs() {
  try {
    const sourceTabs = await chrome.tabs.query({
      url: ['https://crotpedia.net/*', 'https://www.crotpedia.net/*']
    });
    const keeper = preferredSourceTab(sourceTabs);
    if (!keeper) return;

    const allTabs = await chrome.tabs.query({});
    const removableIds = allTabs.flatMap((tab) => {
      if (typeof tab.id !== 'number' || tab.id === keeper.id || typeof tab.url !== 'string') return [];
      try {
        const url = new URL(tab.url);
        const isDuplicateSource = url.hostname === 'crotpedia.net' || url.hostname === 'www.crotpedia.net';
        const isRestoredGrimoire = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        return isDuplicateSource || isRestoredGrimoire ? [tab.id] : [];
      } catch {
        return [];
      }
    });
    if (removableIds.length) await chrome.tabs.remove(removableIds);
  } catch {
    // Cleanup is best-effort and must never stop the gateway polling loop.
  }
}

async function pollForever() {
  while (true) {
    const settings = await config();
    if (!settings.gatewayToken) {
      await delay(3_000);
      continue;
    }

    try {
      activePoll = new AbortController();
      const response = await fetch(`${settings.gatewayUrl}/v1/extension/poll`, {
        headers: authorization(settings.gatewayToken),
        cache: 'no-store',
        signal: activePoll.signal
      });
      activePoll = undefined;
      if (response.status === 204) continue;
      if (!response.ok) throw new Error(`Gateway poll returned HTTP ${response.status}`);
      const payload = await response.json();
      if (payload.job?.action === 'open') await focusOrOpenSourceTab(settings, payload.job);
      else if (payload.job?.action === 'close') await closeSourceTabs(settings, payload.job);
      else if (payload.job) await completeJob(settings, payload.job);
    } catch (error) {
      activePoll = undefined;
      if (error instanceof Error && error.name === 'AbortError') continue;
      await delay(2_000);
    }
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'configUpdated') {
    activePoll?.abort();
    sendResponse({ ok: true });
  }
});

async function initialize() {
  try {
    const runtimeConfig = await import('./runtime-config.js');
    launcherToken = typeof runtimeConfig.gatewayToken === 'string' ? runtimeConfig.gatewayToken.trim() : '';
  } catch {
    // The packaged extension continues to use the token saved from its options page.
  }

  await cleanRestoredHelperTabs();
  void (async () => {
    await delay(1_500);
    await cleanRestoredHelperTabs();
    await delay(3_500);
    await cleanRestoredHelperTabs();
  })();
  await pollForever();
}

void initialize();
