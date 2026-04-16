/**
 * Composer Inspector - Chrome Extension for Piano Experience Flow Visualization
 * Copyright (C) 2025 Rupert Knowles
 * Licensed under GNU GPL-3.0 - see LICENSE file for details
 */

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open a resizable popup window
  chrome.windows.create({
    url: chrome.runtime.getURL('popup.html'),
    type: 'popup',
    width: 1000,
    height: 800,
    focused: true
  });
});