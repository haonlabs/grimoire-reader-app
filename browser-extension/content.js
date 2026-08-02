chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'grimoireSnapshot') return;
  sendResponse({
    finalUrl: window.location.href,
    html: document.documentElement.outerHTML,
    status: 200
  });
});
