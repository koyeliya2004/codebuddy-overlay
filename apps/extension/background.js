// Background service worker for CodeBuddy Chrome Extension

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'capture-tab') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'trigger-capture' });
    }
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle-panel' });
  }
});
