import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const GATEWAY_HEALTH_URL = 'http://127.0.0.1:8787/health';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const LAUNCH_COOLDOWN = 15_000;
const execFileAsync = promisify(execFile);
let lastLaunchAt = 0;

function isLocalRequest(request: Request) {
  return LOCAL_HOSTS.has(new URL(request.url).hostname);
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return false;
  const fetchSite = request.headers.get('sec-fetch-site');
  return !fetchSite || fetchSite === 'same-origin' || fetchSite === 'none';
}

async function gatewayStatus() {
  try {
    const response = await fetch(GATEWAY_HEALTH_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2_000)
    });
    const payload = (await response.json()) as {
      extensionConnected?: boolean;
      ok?: boolean;
      transport?: string;
    };
    return {
      extensionConnected: Boolean(payload.extensionConnected),
      gatewayOnline: response.ok && Boolean(payload.ok),
      transport: payload.transport ?? null
    };
  } catch {
    return { extensionConnected: false, gatewayOnline: false, transport: null };
  }
}

function focusOrOpenScript(applicationName: 'Brave Browser' | 'Google Chrome') {
  return `
tell application "${applicationName}"
  activate
  repeat with browserWindow in windows
    repeat with tabIndex from 1 to count of tabs of browserWindow
      set tabAddress to URL of tab tabIndex of browserWindow
      if tabAddress is not missing value then
        if tabAddress starts with "https://crotpedia.net/" or tabAddress starts with "https://www.crotpedia.net/" then
          set active tab index of browserWindow to tabIndex
          set index of browserWindow to 1
          return "focused"
        end if
      end if
    end repeat
  end repeat
  if (count of windows) is 0 then make new window
  tell front window to make new tab with properties {URL:"https://crotpedia.net/"}
  activate
  return "opened"
end tell`;
}

function closeTabsScript(applicationName: 'Brave Browser' | 'Google Chrome') {
  return `
tell application "${applicationName}"
  repeat with browserWindow in windows
    repeat with tabIndex from (count of tabs of browserWindow) to 1 by -1
      set tabAddress to URL of tab tabIndex of browserWindow
      if tabAddress is not missing value then
        if tabAddress starts with "https://crotpedia.net/" or tabAddress starts with "https://www.crotpedia.net/" then
          close tab tabIndex of browserWindow
        end if
      end if
    end repeat
  end repeat
  return "closed"
end tell`;
}

async function focusOrOpenCrotpediaOnMac() {
  for (const applicationName of ['Brave Browser', 'Google Chrome'] as const) {
    try {
      await execFileAsync('/usr/bin/open', ['-Ra', applicationName], { timeout: 3_000 });
      const { stdout } = await execFileAsync('/usr/bin/osascript', ['-e', focusOrOpenScript(applicationName)], {
        timeout: 10_000
      });
      return stdout.trim() || 'opened';
    } catch {
      // Try the next supported browser.
    }
  }
  throw new Error('Brave Browser or Google Chrome could not open the CrotPedia tab.');
}

async function closeCrotpediaTabsOnMac() {
  for (const applicationName of ['Brave Browser', 'Google Chrome'] as const) {
    try {
      await execFileAsync('/usr/bin/open', ['-Ra', applicationName], { timeout: 3_000 });
      const { stdout } = await execFileAsync('/usr/bin/osascript', ['-e', closeTabsScript(applicationName)], {
        timeout: 10_000
      });
      return stdout.trim() || 'closed';
    } catch {
      // Try the next supported browser.
    }
  }
  throw new Error('Brave Browser or Google Chrome could not close the CrotPedia tab.');
}

async function extensionTabAction(action: 'open' | 'close') {
  const gatewayUrl = env.GRIMOIRE_BROWSER_GATEWAY_URL?.trim().replace(/\/$/, '') || 'http://127.0.0.1:8787';
  const gatewayToken = env.GRIMOIRE_BROWSER_GATEWAY_TOKEN?.trim();
  if (!gatewayToken) throw new Error('Local browser gateway token is not configured.');

  const response = await fetch(`${gatewayUrl}/v1/extension/${action}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gatewayToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: 'https://crotpedia.net/' }),
    signal: AbortSignal.timeout(10_000)
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string; handled?: boolean };
  if (!response.ok) throw new Error(payload.error ?? `Browser gateway returned HTTP ${response.status}`);
  return Boolean(payload.handled);
}

async function openCrotpediaTab() {
  if (await extensionTabAction('open')) return 'extension';
  return focusOrOpenCrotpediaOnMac();
}

async function closeCrotpediaTab() {
  if (await extensionTabAction('close')) return 'extension';
  return closeCrotpediaTabsOnMac();
}

export const GET: RequestHandler = async ({ request }) => {
  if (!isLocalRequest(request)) {
    return json({ supported: false, extensionConnected: false, gatewayOnline: false }, { status: 403 });
  }
  return json({ supported: process.platform === 'darwin', ...(await gatewayStatus()) });
};

export const POST: RequestHandler = async ({ request }) => {
  if (!isLocalRequest(request) || !isSameOrigin(request)) {
    return json({ error: 'Local bridge can only be started from this local Grimoire app.' }, { status: 403 });
  }
  if (process.platform !== 'darwin') {
    return json({ error: 'Automatic bridge startup is only available on macOS.' }, { status: 501 });
  }

  const requestBody = (await request.json().catch(() => ({}))) as {
    closeBrowser?: boolean;
    openBrowser?: boolean;
  };
  const currentStatus = await gatewayStatus();
  if (requestBody.closeBrowser === true) {
    try {
      const closeMethod = currentStatus.extensionConnected
        ? await closeCrotpediaTab()
        : await closeCrotpediaTabsOnMac();
      return json({ closed: true, closeMethod, ...currentStatus });
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : 'Unable to close the CrotPedia tab.' },
        { status: 502 }
      );
    }
  }
  if (currentStatus.extensionConnected) {
    if (requestBody.openBrowser === true) {
      try {
        const openMethod = await openCrotpediaTab();
        return json({ started: false, opened: true, openMethod, ...currentStatus });
      } catch (error) {
        return json(
          { error: error instanceof Error ? error.message : 'Unable to open the CrotPedia tab.' },
          { status: 502 }
        );
      }
    }
    return json({ started: false, alreadyConnected: true, ...currentStatus });
  }

  const now = Date.now();
  if (now - lastLaunchAt < LAUNCH_COOLDOWN) {
    return json({ started: false, alreadyStarting: true, ...currentStatus });
  }

  const launcherPath = resolve(process.cwd(), 'Start CrotPedia.command');
  if (!existsSync(launcherPath)) {
    return json({ error: 'CrotPedia launcher was not found in the project folder.' }, { status: 404 });
  }

  try {
    const launcher = spawn('/bin/zsh', [launcherPath], {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore'
    });
    launcher.unref();
    lastLaunchAt = now;
    return json({ started: true, ...currentStatus });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Unable to start the local CrotPedia helper.' },
      { status: 500 }
    );
  }
};
