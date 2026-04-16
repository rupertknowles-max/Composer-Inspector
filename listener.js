/**
 * Composer Inspector - Chrome Extension for Piano Experience Flow Visualization
 * Copyright (C) 2025 Rupert Knowles
 * Licensed under GNU GPL-3.0 - see LICENSE file for details
 */

document.addEventListener('TpTraceCaptured', (event) => {
    const capturedData = event.detail;
  
    chrome.storage.local.set({ 'lastTpTrace': capturedData });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'ping') {
        sendResponse({ success: true });
    } else if (message.action === 'captureTrace') {
        document.dispatchEvent(new CustomEvent('ExecuteTpTrace'));
        sendResponse({ success: true });
    }
});