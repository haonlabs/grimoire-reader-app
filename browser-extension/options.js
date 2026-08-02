const gatewayUrl = document.querySelector('#gatewayUrl');
const gatewayToken = document.querySelector('#gatewayToken');
const status = document.querySelector('#status');

async function restore() {
  const stored = await chrome.storage.local.get(['gatewayUrl', 'gatewayToken']);
  gatewayUrl.value = stored.gatewayUrl || 'http://127.0.0.1:8787';
  gatewayToken.value = stored.gatewayToken || '';
}

async function save() {
  await chrome.storage.local.set({
    gatewayUrl: gatewayUrl.value.trim().replace(/\/$/, ''),
    gatewayToken: gatewayToken.value.trim()
  });
  await chrome.runtime.sendMessage({ type: 'configUpdated' }).catch(() => {});
  status.textContent = 'Saved. The background bridge is connecting.';
  status.className = 'status success';
}

async function test() {
  status.textContent = 'Checking gateway…';
  status.className = 'status';
  try {
    const response = await fetch(`${gatewayUrl.value.trim().replace(/\/$/, '')}/health`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error('Gateway is unavailable');
    status.textContent = result.extensionConnected
      ? 'Gateway online. Extension bridge connected.'
      : 'Gateway online. Save the token and wait a few seconds for the bridge.';
    status.className = 'status success';
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Gateway test failed';
    status.className = 'status error';
  }
}

document.querySelector('#save').addEventListener('click', save);
document.querySelector('#test').addEventListener('click', test);
restore();
