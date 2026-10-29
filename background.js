'use strict';

const DB_NAME = 'FontGlassDB';
const STORE_NAME = 'fonts';

function openFontDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetFont(id) {
  const db = await openFontDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSetFont(id, buffer) {
  const db = await openFontDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(buffer, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function bufferToBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

async function base64ToBuffer(base64) {
  const res = await fetch('data:application/octet-stream;base64,' + base64);
  return await res.arrayBuffer();
}

// Programmatically attach content scripts to tabs that were already open before install/reload.
async function attach(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['fonts.js', 'content.js']
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error.message || error) };
  }
}

async function attachOpenTabs() {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  await Promise.allSettled(tabs.map(tab => (tab.id ? attach(tab.id) : Promise.resolve())));
}

chrome.runtime.onInstalled.addListener(() => {
  attachOpenTabs().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'font-glass-get-font' && message.id) {
    (async () => {
      const id = message.id;
      let buf = await idbGetFont(id);
      if (!buf) {
        // Seamless migration from legacy chrome.storage.local base64 if present
        const legacyKey = 'fontData:' + id;
        const saved = await chrome.storage.local.get(legacyKey);
        if (saved[legacyKey]) {
          buf = await base64ToBuffer(saved[legacyKey]);
          await idbSetFont(id, buf);
          await chrome.storage.local.remove(legacyKey);
        }
      }
      if (!buf) return { ok: false };
      return { ok: true, base64: bufferToBase64(buf) };
    })().then(sendResponse, error => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type !== 'font-glass-apply') return;
  (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:\/\//.test(tab.url || '')) {
      return { ok: false, reason: 'restricted' };
    }
    try {
      return await chrome.tabs.sendMessage(tab.id, { type: 'font-glass-refresh' }, { frameId: 0 });
    } catch {
      const result = await attach(tab.id);
      if (!result.ok) return result;
      return await chrome.tabs.sendMessage(tab.id, { type: 'font-glass-refresh' }, { frameId: 0 });
    }
  })().then(sendResponse, error => sendResponse({ ok: false, error: String(error) }));
  return true;
});
