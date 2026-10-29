(() => {
  'use strict';
  if (globalThis.FontGlassFonts) return;
  const faces = new Map();
  const DB_NAME = 'FontGlassDB';
  const STORE_NAME = 'fonts';
  const isExtensionOrigin = location.protocol === 'chrome-extension:';

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

  async function putBinaryFont(id, buffer) {
    const db = await openFontDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(buffer, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function deleteBinaryFont(id) {
    try {
      const db = await openFontDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
    try {
      await chrome.storage.local.remove('fontData:' + id);
    } catch {}
  }

  async function getFontBytesFromIDB(id) {
    const db = await openFontDB();
    const buf = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (buf) return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    // Migrate legacy storage.local entry if present
    const legacyKey = 'fontData:' + id;
    const saved = await chrome.storage.local.get(legacyKey);
    if (saved[legacyKey]) {
      const decoded = await decode(saved[legacyKey]);
      await putBinaryFont(id, decoded.buffer);
      await chrome.storage.local.remove(legacyKey);
      return decoded;
    }
    return null;
  }

  async function decode(base64) {
    try {
      const res = await fetch('data:application/octet-stream;base64,' + base64);
      return new Uint8Array(await res.arrayBuffer());
    } catch {
      const s = atob(base64);
      const b = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
      return b;
    }
  }

  async function fetchFontBytes(id) {
    if (isExtensionOrigin) {
      return await getFontBytesFromIDB(id);
    }
    try {
      const res = await chrome.runtime.sendMessage({ type: 'font-glass-get-font', id });
      if (res?.ok && res.base64) {
        return await decode(res.base64);
      }
    } catch {}
    const saved = await chrome.storage.local.get('fontData:' + id);
    if (saved['fontData:' + id]) {
      return await decode(saved['fontData:' + id]);
    }
    return null;
  }

  function parseFvarTable(view, offset, length) {
    if (offset + 16 > view.byteLength || length < 16) return null;
    const major = view.getUint16(offset, false);
    if (major !== 1) return null;
    const axesOffset = view.getUint16(offset + 4, false);
    const axisCount = view.getUint16(offset + 8, false);
    const axisSize = view.getUint16(offset + 10, false);
    if (!axisCount || axisSize < 20) return null;
    const axes = {};
    for (let i = 0; i < axisCount; i++) {
      const pos = offset + axesOffset + i * axisSize;
      if (pos + 20 > view.byteLength) break;
      const tag = String.fromCharCode(
        view.getUint8(pos),
        view.getUint8(pos + 1),
        view.getUint8(pos + 2),
        view.getUint8(pos + 3)
      );
      const min = Math.round((view.getInt32(pos + 4, false) / 65536) * 10) / 10;
      const def = Math.round((view.getInt32(pos + 8, false) / 65536) * 10) / 10;
      const max = Math.round((view.getInt32(pos + 12, false) / 65536) * 10) / 10;
      if (max > min) axes[tag] = { min, def, max };
    }
    return Object.keys(axes).length ? axes : null;
  }

  // Inspects TTF, OTF, and WOFF1 binary headers for the OpenType 'fvar' table.
  async function inspectAxes(buffer) {
    try {
      const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      if (view.byteLength < 12) return null;
      const sig = view.getUint32(0, false);
      if (sig === 0x00010000 || sig === 0x4f54544f || sig === 0x74727565) {
        const numTables = view.getUint16(4, false);
        for (let i = 0; i < numTables; i++) {
          const rec = 12 + i * 16;
          if (rec + 16 > view.byteLength) break;
          if (view.getUint32(rec, false) === 0x66766172) {
            return parseFvarTable(view, view.getUint32(rec + 8, false), view.getUint32(rec + 12, false)) || {};
          }
        }
        return {};
      }
      if (sig === 0x774f4646 && view.byteLength >= 44) {
        const numTables = view.getUint16(12, false);
        for (let i = 0; i < numTables; i++) {
          const rec = 44 + i * 20;
          if (rec + 20 > view.byteLength) break;
          if (view.getUint32(rec, false) === 0x66766172) {
            const offset = view.getUint32(rec + 4, false);
            const compLen = view.getUint32(rec + 8, false);
            const origLen = view.getUint32(rec + 12, false);
            if (offset + compLen > view.byteLength) return null;
            if (compLen === origLen) return parseFvarTable(view, offset, origLen) || {};
            if (typeof DecompressionStream === 'function') {
              const slice = bytes.subarray(offset, offset + compLen);
              const ds = new DecompressionStream('deflate');
              const writer = ds.writable.getWriter();
              writer.write(slice);
              writer.close();
              const raw = new Uint8Array(await new Response(ds.readable).arrayBuffer());
              return parseFvarTable(new DataView(raw.buffer, raw.byteOffset, raw.byteLength), 0, raw.byteLength) || {};
            }
          }
        }
        return {};
      }
    } catch {}
    return null;
  }

  async function inspectBlobAxes(blob) {
    try {
      const headBuf = await blob.slice(0, 1024).arrayBuffer();
      const headView = new DataView(headBuf);
      if (headView.byteLength < 12) return {};
      const sig = headView.getUint32(0, false);
      if (sig === 0x00010000 || sig === 0x4f54544f || sig === 0x74727565) {
        const numTables = headView.getUint16(4, false);
        for (let i = 0; i < numTables; i++) {
          const rec = 12 + i * 16;
          if (rec + 16 > headView.byteLength) break;
          if (headView.getUint32(rec, false) === 0x66766172) {
            const offset = headView.getUint32(rec + 8, false);
            const length = headView.getUint32(rec + 12, false);
            const tableBuf = await blob.slice(offset, offset + Math.min(length, 4096)).arrayBuffer();
            return parseFvarTable(new DataView(tableBuf), 0, tableBuf.byteLength) || {};
          }
        }
        return {};
      }
    } catch {}
    return null;
  }

  let queue = Promise.resolve();
  async function load(records, selected) {
    const wanted = new Set((selected || []).filter(Boolean));
    for (const [id, face] of faces) {
      if (!wanted.has(id)) {
        document.fonts.delete(face);
        faces.delete(id);
      }
    }
    for (const item of records || []) {
      if (!wanted.has(item.id) || faces.has(item.id)) continue;
      try {
        const bytes = await fetchFontBytes(item.id);
        if (!bytes) continue;
        const face = new FontFace(item.id, bytes, { weight: '100 900' });
        await face.load();
        document.fonts.add(face);
        faces.set(item.id, face);
      } catch (err) {
        console.warn('[Font Glass] Failed to load imported font:', item.id, err);
      }
    }
  }

  function sync(records, selected) {
    const next = queue.catch(() => {}).then(() => load(records, selected));
    queue = next;
    return next;
  }

  globalThis.FontGlassFonts = {
    sync,
    decode,
    inspectAxes,
    inspectBlobAxes,
    putBinaryFont,
    deleteBinaryFont
  };
})();
