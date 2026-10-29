'use strict';
const $ = id => document.getElementById(id);
const options = location.pathname.endsWith('options.html') || new URLSearchParams(location.search).has('options');
if (options) document.body.classList.add('options');

const defaults = {
  enabled: true,
  family: '',
  sizeMode: 'original',
  scale: 100,
  fixed: 16,
  italic: 'original',
  varWeightEnabled: false,
  varWeight: 400,
  fauxWeightEnabled: false,
  fauxWeight: 400,
  codeFamily: '',
  codeLigatures: 'original',
  krFont: '',
  cnFont: '',
  jpFont: '',
  excluded: []
};

let settings = { ...defaults };
let prefs = { lang: 'vi', theme: 'light' };
let fonts = [];
let localAxes = {};
let source = '';
let host = '';
let imported = [];
let saveTimer = 0;
let resetFlashTimer = 0;
let resetJustDone = false;
const viCache = new Map();
const varCache = new Map();

const text = {
  vi: {
    importTitle: 'Font từ file',
    importHelp: 'Ưu tiên WOFF2 (hoặc WOFF, TTF, OTF) • tối đa 20 MB/file, 50 MB tổng. Lưu nhị phân trực tiếp trong IndexedDB.',
    importOpen: 'Nhập font trong cài đặt ↗',
    importFile: 'Chọn file font',
    deleteFont: 'Xoá font đã nhập',
    importAttnBtn: '⚠️ Chú ý',
    importAttnHead: '⚠️ Lưu ý trước khi nạp font từ file:',
    importAttnBody: 'Đây là phương án dự phòng chưa tối ưu bằng cài trực tiếp vào máy (vì trình duyệt phải tự nạp file font vào bộ nhớ). Nếu có thể, hãy cài font kiểu "Install for all users" vào Windows. Chỉ nên dùng mục này khi máy công ty hoặc máy bị khoá quyền cài đặt — và hãy ưu tiên file .woff2 cho nhẹ, nếu không có thì hãy chọn lọc cẩn thận.',
    localAttnBtn: '💡 Cách cài font',
    localAttnHead: 'Cách cài font chuẩn vào Windows (nhẹ & mượt nhất):',
    localStep1: 'Tải file font (.ttf hoặc .otf) về máy và giải nén nếu là file .zip.',
    localStep2: 'Bôi đen các file font → Chuột phải → chọn "Install for all users" (Cài đặt cho mọi người dùng).',
    localStep3: 'Mở cài đặt Font Glass → bấm "Quét font" là dùng được ngay, không tốn RAM trình duyệt.',
    codeTitle: 'Font riêng cho code',
    codeHelp: 'Áp dụng cho pre/code/kbd/samp, gồm các đoạn tô màu cú pháp.',
    codeLigLabel: 'Nối ký tự code (Ligatures)',
    ligOn: 'Bật ligatures (=> !== ===)',
    ligOff: 'Tắt ligatures',
    cjkTitle: 'Font riêng cho web Hàn · Trung · Nhật',
    cjkHelp: 'Tự động ưu tiên dùng thay cho font chính khi vào forum, báo hoặc trang web của 3 nước này. Nên ưu tiên chọn các font chuyên dụng cho từng ngôn ngữ (chữ Hán, Kana, Hangul chuẩn) để thấy rõ sự khác biệt của nét chữ, tránh bị xem xêm nhau.',
    krLabel: '🇰🇷 Web Hàn Quốc (Forum, báo, trang .kr)',
    cnLabel: '🇨🇳 Web Trung Quốc (Forum, báo, .cn/.tw/.hk)',
    jpLabel: '🇯🇵 Web Nhật Bản (Forum, báo, trang .jp)',
    cjkDefault: 'Dùng theo font chính (hoặc mặc định web)',
    importedLabel: 'File đã nhập',
    importing: 'Đang kiểm tra và lưu nhị phân vào IndexedDB…',
    importError: 'Không nhập được: file lỗi, định dạng không hỗ trợ hoặc vượt giới hạn dung lượng.',
    importDone: 'Đã lưu vào IndexedDB. Chọn font này cho nội dung hoặc code.',
    codeOriginal: 'Giữ font code của website',
    applied: 'Đã kiểm tra trang • số phần tử được xử lý:',
    applyFailed: 'Đã lưu nhưng chưa áp dụng được: tải lại trang và kiểm tra quyền truy cập website.',
    applyNow: 'Áp dụng lại trang này',
    tag: 'Web theo cách bạn muốn.',
    enabled: 'Bật tuỳ chỉnh chữ',
    global: 'Áp dụng chung trên các website HTTP/HTTPS.',
    fontTitle: '01 / Font cục bộ',
    scanNote: 'Quét trong tab cài đặt để hộp xin quyền không làm đóng popup.',
    scan: 'Quét font',
    fallback: 'Quét dự phòng',
    search: 'Tìm font đã cài…',
    family: 'Họ font',
    scopeNote: 'Bao gồm font cài cho mọi người dùng mà trình duyệt nhìn thấy.',
    typeTitle: '02 / Kiểu chữ',
    size: 'Cỡ chữ',
    original: 'Giữ nguyên',
    scale: 'Tỷ lệ (%)',
    fixed: 'Cố định (px)',
    sizeHelp: '% giữ tỷ lệ tiêu đề. px đưa chữ về cùng một cỡ.',
    italicLabel: 'Chữ nghiêng',
    italic: 'Bật nghiêng',
    normal: 'Chữ đứng',
    varWeightLabel: 'Trục Variable Font (wght)',
    varWeightNoFont: 'Chọn một Variable Font ở mục 01 để mở khoá thanh chỉnh độ đậm biến thiên.',
    varWeightUnsupported: 'Font đang chọn là font tĩnh (không có VF) — đã làm tối, hãy dùng thanh Giả lập bên dưới.',
    varWeightSupported: '✓ Hỗ trợ trục biến thiên wght',
    varStaticBadge: 'Tĩnh',
    fauxWeightLabel: 'Giả lập đậm / mảnh (Faux Bold)',
    fauxAttnBtn: '⚠️ Lưu ý',
    fauxAttnBody: 'Cần chú ý vì đây không phải Variable Font mà chỉ là giả lập (Faux Bold), cẩn thận khi tuỳ chỉnh.',
    fauxNoFont: 'Chọn một font tĩnh (không có VF) ở mục 01 để mở khoá thanh giả lập đậm / mảnh.',
    fauxLockedVF: 'Đang chọn Variable Font — đã làm tối thanh giả lập (hãy chỉnh ở thanh Variable Font phía trên).',
    fauxReadyHint: 'Kéo sang trái (< 400) để làm mảnh hơn, kéo sang phải (> 400) để giả lập đậm hơn.',
    fauxThinTag: 'Mỏng',
    fauxNormalTag: 'Chuẩn',
    fauxBoldTag: 'Đậm',
    fauxDangerHead: '🚨 Cảnh báo mức giả lập quá cao:',
    fauxDangerBody: 'Kéo quá nấc an toàn (< 250 hoặc > 600) dễ làm vỡ/dính nét font, lệch bố cục UI trang web và hãy cẩn thận với CPU & RAM do trình duyệt phải tốn thêm tài nguyên để tải & dựng hình font.',
    viOk: '✓ Hiển thị tốt Tiếng Việt (đầy đủ dấu)',
    viWarn: '⚠️ Thiếu dấu Tiếng Việt (lỗi ký tự',
    resetReady: '↺ Khôi phục mặc định',
    resetAtDefault: '✓ Đang ở mặc định',
    resetDoneBtn: '✓ Đã khôi phục mặc định!',
    resetDefaultNote: 'Đang ở mặc định gốc • Chưa có tuỳ chỉnh nào cần khôi phục (kho font đã quét & đã nhập luôn được giữ nguyên).',
    resetActiveNote: 'Khôi phục sẽ đưa họ font, font Hàn/Trung/Nhật, font code, cỡ chữ, nghiêng, độ đậm & trang tắt về gốc (giữ nguyên font đã quét/nhập).',
    resetDoneNote: '✓ Đã khôi phục hoàn tất: Toàn bộ kiểu chữ đã về mặc định của website (danh sách font đã quét & đã nhập vẫn giữ nguyên).',
    resetStatus: '✓ Đã khôi phục kiểu chữ về mặc định gốc.',
    options: 'Mở cài đặt ↗',
    privacy: 'Chỉ lưu trên máy · Không thu thập dữ liệu',
    websiteFont: 'Font gốc của website',
    saved: 'Đã lưu • tự áp dụng trên trang đang mở.',
    none: 'Chưa quét font.',
    count: 'họ font',
    scanning: 'Đang quét…',
    local: 'Local Font Access',
    backup: 'API font trình duyệt (dự phòng)',
    failed: 'Không thể dùng Local Font Access. Thử “Quét dự phòng”.',
    backupFailed: 'Không lấy được font. Kiểm tra quyền extension rồi thử lại.',
    pause: 'Tạm tắt trang này',
    resume: 'Bật lại trang này',
    restricted: 'Trang nội bộ / trang được bảo vệ không hỗ trợ.',
    theme: 'Giao diện tối',
    tabNote: 'Bấm “Quét font” và cho phép trình duyệt truy cập font trên máy.',
    empty: 'Không có font khớp tìm kiếm.',
    sizeError: 'Nhập 50–200% hoặc 8–72px.',
    error: 'Không lưu được. Hãy thử mở lại extension.',
    paused: 'Đã tắt trên tên miền này.',
    noList: 'Trình duyệt trả về danh sách rỗng.'
  },
  en: {
    importTitle: 'Import a font file',
    importHelp: 'Prefer WOFF2 (or WOFF, TTF, OTF) • 20 MB/file, 50 MB total. Stored as raw binary in IndexedDB.',
    importOpen: 'Import in settings ↗',
    importFile: 'Choose a font file',
    deleteFont: 'Delete imported font',
    importAttnBtn: '⚠️ Attention',
    importAttnHead: '⚠️ Note before importing font files:',
    importAttnBody: 'This is a fallback method and uses more browser memory than OS-installed fonts. Whenever possible, install fonts in Windows using "Install for all users". Only use file import on locked/work PCs without Admin rights — prioritize .woff2 files and use heavy .ttf/.otf files sparingly.',
    localAttnBtn: '💡 How to install',
    localAttnHead: 'How to install fonts in Windows (fastest & lightest):',
    localStep1: 'Download the font (.ttf or .otf) and unzip if needed.',
    localStep2: 'Select the font files → Right-click → choose "Install for all users" so the browser can detect them.',
    localStep3: 'Open Font Glass settings → click "Scan fonts" to use them with zero browser RAM overhead.',
    codeTitle: 'Separate code font',
    codeHelp: 'Applies to pre/code/kbd/samp, including syntax-highlighted spans.',
    codeLigLabel: 'Code ligatures',
    ligOn: 'Enable ligatures (=> !== ===)',
    ligOff: 'Disable ligatures',
    cjkTitle: 'Fonts for Korean · Chinese · Japanese sites',
    cjkHelp: 'Automatically overrides the main font when visiting forums, news, or websites from these 3 regions. Prefer dedicated fonts for each script (standard Hanzi, Kana, Hangul) to clearly see distinct stroke variations rather than looking generic.',
    krLabel: '🇰🇷 Korean sites (Forums, news, .kr)',
    cnLabel: '🇨🇳 Chinese sites (Forums, news, .cn/.tw/.hk)',
    jpLabel: '🇯🇵 Japanese sites (Forums, news, .jp)',
    cjkDefault: 'Use main font (or website default)',
    importedLabel: 'Imported files',
    importing: 'Validating and saving binary to IndexedDB…',
    importError: 'Import failed: invalid file, unsupported format or size limit exceeded.',
    importDone: 'Saved to IndexedDB. Select this font for website text or code.',
    codeOriginal: 'Keep website code font',
    applied: 'Page checked • styled elements:',
    applyFailed: 'Saved, but could not apply: reload the page and check site access.',
    applyNow: 'Reapply to this page',
    tag: 'The web, the way you want.',
    enabled: 'Enable text styling',
    global: 'Applies globally to HTTP/HTTPS websites.',
    fontTitle: '01 / Local fonts',
    scanNote: 'Scan in the settings tab so permission prompts do not close the popup.',
    scan: 'Scan fonts',
    fallback: 'Fallback scan',
    search: 'Search installed fonts…',
    family: 'Font family',
    scopeNote: 'Includes all-users fonts visible to this browser.',
    typeTitle: '02 / Typography',
    size: 'Font size',
    original: 'Keep original',
    scale: 'Relative (%)',
    fixed: 'Fixed (px)',
    sizeHelp: '% preserves heading proportions. px gives text one size.',
    italicLabel: 'Italic style',
    italic: 'Use italic',
    normal: 'Use upright',
    varWeightLabel: 'Variable Font Axis (wght)',
    varWeightNoFont: 'Select a Variable Font in section 01 to unlock the weight axis slider.',
    varWeightUnsupported: 'Selected font is static (non-VF) — dimmed; use the Faux Bold slider below.',
    varWeightSupported: '✓ Variable wght axis supported',
    varStaticBadge: 'Static',
    fauxWeightLabel: 'Faux Bold / Thin Simulation',
    fauxAttnBtn: '⚠️ Note',
    fauxAttnBody: 'Please note this is not a Variable Font — weight is simulated (Faux Bold). Adjust carefully.',
    fauxNoFont: 'Select a static (non-VF) font in section 01 to unlock Faux Bold simulation.',
    fauxLockedVF: 'Variable Font selected — Faux slider is dimmed (use the Variable Font slider above).',
    fauxReadyHint: 'Drag left (< 400) for thinner text, or right (> 400) for simulated bold.',
    fauxThinTag: 'Thin',
    fauxNormalTag: 'Normal',
    fauxBoldTag: 'Bold',
    fauxDangerHead: '🚨 High Faux Simulation Warning:',
    fauxDangerBody: 'Pushing beyond safe thresholds (< 250 or > 600) may distort glyphs, break website UI layouts, and increase CPU & RAM usage while rendering fonts.',
    viOk: '✓ Full Vietnamese diacritic support',
    viWarn: '⚠️ Missing Vietnamese glyphs (fallback on',
    resetReady: '↺ Reset to defaults',
    resetAtDefault: '✓ Already at default',
    resetDoneBtn: '✓ Defaults restored!',
    resetDefaultNote: 'Currently at default • No custom styling active (scanned & imported font libraries are preserved).',
    resetActiveNote: 'Reset restores main font, KR/CN/JP fonts, code font, size, italic, weight & paused sites to default (keeps scanned/imported fonts).',
    resetDoneNote: '✓ Restored: All typography settings returned to website defaults (scanned & imported fonts were kept).',
    resetStatus: '✓ Restored typography settings to defaults.',
    options: 'Open settings ↗',
    privacy: 'Stored locally · No tracking',
    websiteFont: 'Original website font',
    saved: 'Saved • applied to open pages.',
    none: 'No fonts scanned yet.',
    count: 'font families',
    scanning: 'Scanning…',
    local: 'Local Font Access',
    backup: 'Browser font API (fallback)',
    failed: 'Local Font Access is unavailable or denied. Try “Fallback scan”.',
    backupFailed: 'Could not list fonts. Check extension permissions and retry.',
    pause: 'Pause this site',
    resume: 'Enable this site',
    restricted: 'Internal / protected browser pages are not supported.',
    theme: 'Dark appearance',
    tabNote: 'Click “Scan fonts” and allow access to installed fonts.',
    empty: 'No matching fonts.',
    sizeError: 'Enter 50–200% or 8–72px.',
    error: 'Could not save. Reopen the extension and retry.',
    paused: 'Disabled on this hostname.',
    noList: 'The browser returned an empty font list.'
  }
};

const t = key => text[prefs.lang][key] || key;

function status(key, bad = false) {
  $('status').textContent = t(key);
  $('status').classList.toggle('error', bad);
}

function isDefaultSettings() {
  return (
    settings.enabled === true &&
    !settings.family &&
    !settings.codeFamily &&
    !settings.krFont &&
    !settings.cnFont &&
    !settings.jpFont &&
    (settings.codeLigatures || 'original') === 'original' &&
    settings.sizeMode === 'original' &&
    settings.italic === 'original' &&
    !settings.varWeightEnabled &&
    !settings.fauxWeightEnabled &&
    (!Array.isArray(settings.excluded) || settings.excluded.length === 0)
  );
}

function updateResetUI() {
  const btn = $('reset');
  const note = $('resetNote');
  if (resetJustDone) {
    btn.textContent = t('resetDoneBtn');
    btn.classList.add('reset-done');
    btn.disabled = true;
    note.textContent = t('resetDoneNote');
    return;
  }
  btn.classList.remove('reset-done');
  if (isDefaultSettings()) {
    btn.textContent = t('resetAtDefault');
    btn.disabled = true;
    note.textContent = t('resetDefaultNote');
  } else {
    btn.textContent = t('resetReady');
    btn.disabled = false;
    note.textContent = t('resetActiveNote');
  }
}

let measureCanvas;
function getMeasureCtx() {
  if (!measureCanvas) measureCanvas = document.createElement('canvas');
  return measureCanvas.getContext('2d');
}

function checkVietnamese(fontName) {
  if (!fontName) return null;
  if (viCache.has(fontName)) return viCache.get(fontName);
  const ctx = getMeasureCtx();
  const sample = ['đ', 'ẫ', 'ự', 'ệ', 'ắ', 'ộ', 'ơ', 'ư'];
  const fallbacks = ['monospace', 'serif', 'sans-serif'];
  const missing = [];
  for (const ch of sample) {
    const sigs = fallbacks.map(fb => {
      ctx.font = `48px ${JSON.stringify(fontName)}, ${fb}`;
      const m = ctx.measureText(ch);
      return [
        m.width.toFixed(2),
        (m.actualBoundingBoxAscent || 0).toFixed(2),
        (m.actualBoundingBoxDescent || 0).toFixed(2),
        (m.actualBoundingBoxLeft || 0).toFixed(2),
        (m.actualBoundingBoxRight || 0).toFixed(2)
      ].join('|');
    });
    if (!(sigs[0] === sigs[1] && sigs[1] === sigs[2])) {
      missing.push(ch);
    }
  }
  const res = { supported: missing.length === 0, missing };
  viCache.set(fontName, res);
  return res;
}

function probeVariableWeightDOM(fontName) {
  if (!fontName || !document.body) return null;
  const span = document.createElement('span');
  span.textContent = 'HMWO08gQ@#';
  span.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden;white-space:nowrap;font-size:120px;font-weight:400;font-style:normal;font-synthesis:none;line-height:1;';
  span.style.fontFamily = `${JSON.stringify(fontName)}, monospace`;
  document.body.appendChild(span);

  span.style.fontVariationSettings = '"wght" 220';
  const wLow = span.getBoundingClientRect().width;
  span.style.fontVariationSettings = '"wght" 380';
  const wMid = span.getBoundingClientRect().width;
  span.style.fontVariationSettings = '"wght" 680';
  const wHigh = span.getBoundingClientRect().width;
  span.remove();

  if (Math.abs(wHigh - wLow) > 0.15 && Math.abs(wMid - wLow) > 0.05) {
    return { min: 100, def: 400, max: 900 };
  }

  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 90;
  canvas.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden;font-synthesis:none;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const inkAt = wght => {
    canvas.style.fontVariationSettings = `"wght" ${wght}`;
    ctx.clearRect(0, 0, 220, 90);
    ctx.font = `400 68px ${JSON.stringify(fontName)}, monospace`;
    ctx.fillStyle = '#000';
    ctx.fillText('HMWO', 8, 68);
    const data = ctx.getImageData(0, 0, 220, 90).data;
    let sum = 0;
    for (let i = 3; i < data.length; i += 4) sum += data[i];
    return sum;
  };
  const inkLow = inkAt(220);
  const inkHigh = inkAt(680);
  canvas.remove();

  if (Math.abs(inkHigh - inkLow) > 80) {
    return { min: 100, def: 400, max: 900 };
  }
  return null;
}

function detectVarWeight(fontName) {
  if (!fontName) return null;
  if (varCache.has(fontName)) return varCache.get(fontName);

  const imp = imported.find(f => f.id === fontName);
  if (imp && imp.axes !== undefined && imp.axes !== null) {
    const res = imp.axes.wght || null;
    varCache.set(fontName, res);
    return res;
  }

  if (localAxes && Object.prototype.hasOwnProperty.call(localAxes, fontName)) {
    const entry = localAxes[fontName];
    if (entry !== null && entry !== undefined) {
      const res = entry.wght || null;
      varCache.set(fontName, res);
      return res;
    }
  }

  const probed = probeVariableWeightDOM(fontName);
  varCache.set(fontName, probed);
  return probed;
}

function renderViBadge(elId, fontName) {
  const el = $(elId);
  if (!fontName) {
    el.hidden = true;
    return;
  }
  const res = checkVietnamese(fontName);
  if (!res) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  if (res.supported) {
    el.className = 'badge ok';
    el.textContent = t('viOk');
  } else {
    el.className = 'badge warn';
    el.textContent = `${t('viWarn')} ${res.missing.slice(0, 5).join(', ')})`;
  }
}

function formatFauxBadge(val, enabled) {
  if (!enabled) return 'Auto';
  const v = Number(val) || 400;
  if (v < 400) return `${v} (${t('fauxThinTag')})`;
  if (v > 400) return `${v} (${t('fauxBoldTag')})`;
  return `${v} (${t('fauxNormalTag')})`;
}

function updateWeightControlsUI() {
  const varBox = $('varWeightBox');
  const varToggle = $('varWeightEnabled');
  const varSlider = $('varWeight');
  const varBadge = $('varWeightValue');
  const varHint = $('varWeightHint');

  const fauxBox = $('fauxWeightBox');
  const fauxToggle = $('fauxWeightEnabled');
  const fauxSlider = $('fauxWeight');
  const fauxBadge = $('fauxWeightValue');
  const fauxHint = $('fauxWeightHint');
  const fauxDanger = $('fauxDangerBox');

  if (!settings.family) {
    varBox.classList.add('is-disabled');
    varToggle.disabled = true;
    varToggle.checked = false;
    varSlider.disabled = true;
    varBadge.textContent = 'Auto';
    varHint.textContent = t('varWeightNoFont');

    fauxBox.classList.add('is-disabled');
    fauxToggle.disabled = true;
    fauxToggle.checked = false;
    fauxSlider.disabled = true;
    fauxBadge.textContent = 'Auto';
    fauxHint.textContent = t('fauxNoFont');
    fauxDanger.hidden = true;
    return { isVF: false, isStatic: false };
  }

  const wght = detectVarWeight(settings.family);
  if (wght) {
    const min = Math.max(50, Math.floor(wght.min || 100));
    const max = Math.min(1000, Math.ceil(wght.max || 900));
    const def = Math.min(max, Math.max(min, Math.round(wght.def || 400)));
    const current = Number.isFinite(Number(settings.varWeight))
      ? Math.min(max, Math.max(min, Math.round(Number(settings.varWeight))))
      : def;
    settings.varWeight = current;
    if (settings.fauxWeightEnabled) settings.fauxWeightEnabled = false;

    varBox.classList.remove('is-disabled');
    varToggle.disabled = false;
    varToggle.checked = !!settings.varWeightEnabled;
    varSlider.disabled = false;
    varSlider.min = String(min);
    varSlider.max = String(max);
    varSlider.value = String(current);
    varBadge.textContent = settings.varWeightEnabled ? String(current) : 'Auto';
    varHint.textContent = `${t('varWeightSupported')} (${min}–${max})`;

    fauxBox.classList.add('is-disabled');
    fauxToggle.disabled = true;
    fauxToggle.checked = false;
    fauxSlider.disabled = true;
    fauxBadge.textContent = 'VF';
    fauxHint.textContent = t('fauxLockedVF');
    fauxDanger.hidden = true;
    return { isVF: true, isStatic: false };
  }

  if (settings.varWeightEnabled) settings.varWeightEnabled = false;
  varBox.classList.add('is-disabled');
  varToggle.disabled = true;
  varToggle.checked = false;
  varSlider.disabled = true;
  varBadge.textContent = t('varStaticBadge');
  varHint.textContent = t('varWeightUnsupported');

  const fauxVal = Number.isFinite(Number(settings.fauxWeight))
    ? Math.min(900, Math.max(100, Math.round(Number(settings.fauxWeight))))
    : 400;
  settings.fauxWeight = fauxVal;

  fauxBox.classList.remove('is-disabled');
  fauxToggle.disabled = false;
  fauxToggle.checked = !!settings.fauxWeightEnabled;
  fauxSlider.disabled = false;
  fauxSlider.value = String(fauxVal);
  fauxBadge.textContent = formatFauxBadge(fauxVal, settings.fauxWeightEnabled);
  fauxHint.textContent = t('fauxReadyHint');

  const isExtreme = !!settings.fauxWeightEnabled && (fauxVal <= 250 || fauxVal >= 600);
  fauxDanger.hidden = !isExtreme;

  return { isVF: false, isStatic: true };
}

function expandFontList() {
  const select = $('fontList');
  const count = select.options.length;
  if (count > 1) {
    select.size = Math.min(7, Math.max(2, count));
  } else {
    select.removeAttribute('size');
  }
}

function collapseFontList() {
  $('fontList').removeAttribute('size');
}

function renderFonts() {
  const query = $('fontSearch').value.trim().toLocaleLowerCase();
  const all = [
    ...fonts.map(name => ({ id: name, label: name })),
    ...imported.map(f => ({
      id: f.id,
      label: `📁 ${f.name}${f.axes?.wght ? ' (VF)' : ''}`
    }))
  ];
  for (const [id, current, label] of [
    ['fontList', settings.family, t('websiteFont')],
    ['codeFont', settings.codeFamily, t('codeOriginal')],
    ['krFont', settings.krFont, t('cjkDefault')],
    ['cnFont', settings.cnFont, t('cjkDefault')],
    ['jpFont', settings.jpFont, t('cjkDefault')]
  ]) {
    const select = $(id);
    if (!select) continue;
    select.replaceChildren(new Option(label, ''));
    const rows = all.filter(
      f => id !== 'fontList' || f.label.toLocaleLowerCase().includes(query) || f.id === current
    );
    if (current && !all.some(f => f.id === current)) {
      select.add(new Option(current, current));
    }
    rows.forEach(f => select.add(new Option(f.label, f.id)));
    select.value = current || '';
  }
  if (document.activeElement === $('fontSearch')) {
    expandFontList();
  }
  const previous = $('importList').value;
  $('importList').replaceChildren(new Option(t('importedLabel'), ''));
  imported.forEach(f => $('importList').add(new Option(f.name, f.id)));
  $('importList').value = imported.some(f => f.id === previous) ? previous : '';
  $('deleteFont').disabled = !$('importList').value;
  $('source').textContent = fonts.length
    ? `${fonts.length} ${t('count')} · ${t(source === 'local' ? 'local' : 'backup')}`
    : t('none');
}

function render() {
  document.documentElement.lang = prefs.lang;
  document.documentElement.dataset.theme = prefs.theme;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.placeholder);
  });
  $('language').value = prefs.lang;
  $('theme').setAttribute('aria-label', t('theme'));
  $('theme').setAttribute('aria-checked', String(prefs.theme === 'dark'));
  $('enabled').checked = settings.enabled;
  $('sizeMode').value = settings.sizeMode;
  $('italic').value = settings.italic;
  $('codeLigatures').value = settings.codeLigatures || 'original';
  $('sizeValue').disabled = settings.sizeMode === 'original';
  $('sizeValue').min = settings.sizeMode === 'fixed' ? 8 : 50;
  $('sizeValue').max = settings.sizeMode === 'fixed' ? 72 : 200;
  $('sizeValue').value = settings.sizeMode === 'fixed' ? settings.fixed : settings.scale;
  $('siteRow').hidden = !host;
  $('siteRow').style.display = host ? 'flex' : 'none';
  $('siteName').textContent = host;
  $('siteToggle').textContent = t(settings.excluded.includes(host) ? 'resume' : 'pause');
  if (options) $('scanNote').textContent = t('tabNote');
  renderFonts();
  updateResetUI();
  preview();
}

function preview() {
  FontGlassFonts.sync(imported, [
    settings.family,
    settings.codeFamily,
    settings.krFont,
    settings.cnFont,
    settings.jpFont
  ])
    .then(() => {
      if (settings.family?.startsWith('FGImported_')) viCache.delete(settings.family);
      if (settings.codeFamily?.startsWith('FGImported_')) viCache.delete(settings.codeFamily);
      renderViBadge('viCheck', settings.family);
      renderViBadge('codeViCheck', settings.codeFamily);
      const { isVF, isStatic } = updateWeightControlsUI();
      updateResetUI();

      const cp = $('codePreview');
      cp.style.fontFamily = settings.codeFamily ? `${JSON.stringify(settings.codeFamily)}, monospace` : 'monospace';
      if (settings.codeLigatures === 'normal') {
        cp.style.fontVariantLigatures = 'normal';
        cp.style.fontFeatureSettings = '"liga" 1, "calt" 1';
      } else if (settings.codeLigatures === 'none') {
        cp.style.fontVariantLigatures = 'none';
        cp.style.fontFeatureSettings = '"liga" 0, "calt" 0';
      } else {
        cp.style.fontVariantLigatures = '';
        cp.style.fontFeatureSettings = '';
      }

      const p = $('preview');
      p.style.fontFamily = settings.family ? `${JSON.stringify(settings.family)}, sans-serif` : '';
      p.style.fontSize =
        (settings.sizeMode === 'fixed'
          ? settings.fixed
          : settings.sizeMode === 'scale'
          ? (16 * settings.scale) / 100
          : 16) + 'px';
      p.style.fontStyle = settings.italic === 'original' ? 'normal' : settings.italic;

      p.style.fontVariationSettings = '';
      p.style.fontWeight = '';
      p.style.webkitTextStroke = '';
      p.style.opacity = '';

      if (isVF && settings.varWeightEnabled) {
        p.style.fontVariationSettings = `"wght" ${settings.varWeight}`;
        p.style.fontWeight = String(Math.round(settings.varWeight));
      } else if (isStatic && settings.fauxWeightEnabled) {
        const w = Number(settings.fauxWeight) || 400;
        p.style.fontWeight = String(Math.round(w));
        if (w > 400) {
          p.style.webkitTextStroke = `${((w - 400) / 950).toFixed(3)}px currentColor`;
        } else if (w < 400) {
          const lightAlpha = (400 - w) / 450;
          p.style.opacity = String(Math.max(0.78, 1 - lightAlpha * 0.16).toFixed(2));
        }
      }
    })
    .catch(() => status('importError', true));
}

async function applyCurrent() {
  try {
    const result = await chrome.runtime.sendMessage({ type: 'font-glass-apply' });
    if (result?.ok) {
      $('status').textContent = t('applied') + ' ' + result.targets;
      $('status').classList.remove('error');
    } else {
      status(result?.reason === 'restricted' ? 'restricted' : 'applyFailed', true);
    }
  } catch {
    status('applyFailed', true);
  }
}

async function save(customStatusKey = 'saved') {
  if (customStatusKey !== 'resetStatus') {
    resetJustDone = false;
  }
  updateResetUI();
  try {
    await chrome.storage.local.set({ settings });
    status(customStatusKey);
    if (!options && customStatusKey !== 'resetStatus') await applyCurrent();
    else if (!options && customStatusKey === 'resetStatus') {
      await chrome.runtime.sendMessage({ type: 'font-glass-apply' }).catch(() => {});
    }
  } catch {
    status('error', true);
  }
  preview();
}

function scheduleSave(delay = 140) {
  resetJustDone = false;
  preview();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = 0;
    save();
  }, delay);
}

async function scanLocal() {
  if (!options) {
    await chrome.runtime.openOptionsPage();
    return;
  }
  $('scan').disabled = true;
  status('scanning');
  try {
    if (!window.queryLocalFonts) throw new Error('unsupported');
    const data = await window.queryLocalFonts();
    const byFamily = new Map();
    for (const f of data) {
      if (f.family && !byFamily.has(f.family)) byFamily.set(f.family, f);
    }
    const names = [...byFamily.keys()].sort((a, b) => a.localeCompare(b));
    if (!names.length) {
      status('noList', true);
      return;
    }
    const axesMap = {};
    for (const [fam, fontObj] of byFamily) {
      if (typeof fontObj.blob === 'function') {
        try {
          const blob = await fontObj.blob();
          const axes = await FontGlassFonts.inspectBlobAxes(blob);
          if (axes !== null) axesMap[fam] = axes;
        } catch {}
      }
    }
    fonts = names;
    localAxes = axesMap;
    source = 'local';
    varCache.clear();
    viCache.clear();
    await chrome.storage.local.set({ fontCache: { fonts, source, axes: localAxes } });
    renderFonts();
    preview();
    status('saved');
  } catch {
    status('failed', true);
  } finally {
    $('scan').disabled = false;
  }
}

async function scanFallback() {
  $('fallback').disabled = true;
  status('scanning');
  try {
    const data = await chrome.fontSettings.getFontList();
    const names = [...new Set(data.map(f => f.fontId).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
    if (!names.length) {
      status('noList', true);
      return;
    }
    fonts = names;
    localAxes = {};
    source = 'fallback';
    varCache.clear();
    viCache.clear();
    await chrome.storage.local.set({ fontCache: { fonts, source, axes: {} } });
    renderFonts();
    preview();
    status('saved');
  } catch {
    status('backupFailed', true);
  } finally {
    $('fallback').disabled = false;
  }
}

function applySelectedFont() {
  settings.family = $('fontList').value;
  const wght = detectVarWeight(settings.family);
  if (!settings.family) {
    settings.varWeightEnabled = false;
    settings.fauxWeightEnabled = false;
  } else if (wght) {
    settings.fauxWeightEnabled = false;
    settings.varWeight = Math.min(
      Math.ceil(wght.max || 900),
      Math.max(Math.floor(wght.min || 100), Math.round(Number(settings.varWeight) || wght.def || 400))
    );
  } else {
    settings.varWeightEnabled = false;
  }
  save();
}

function setupAttnToggle(btnId, boxId) {
  const btn = $(btnId);
  const box = $(boxId);
  if (!btn || !box) return;
  btn.onclick = () => {
    const nextHidden = !box.hidden;
    box.hidden = nextHidden;
    btn.setAttribute('aria-expanded', String(!nextHidden));
  };
}

async function init() {
  const stored = await chrome.storage.local.get(['settings', 'prefs', 'fontCache', 'importedFonts']);
  settings = { ...defaults, ...stored.settings };
  delete settings.oled;
  imported = stored.importedFonts || [];
  prefs = { ...prefs, ...stored.prefs };
  fonts = stored.fontCache?.fonts || [];
  localAxes = stored.fontCache?.axes || {};
  source = stored.fontCache?.source || '';

  if (!options) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      const u = new URL(tab.url);
      if (/^https?:$/.test(u.protocol)) host = u.hostname;
    } catch {}
  }

  setupAttnToggle('localAttnBtn', 'localAttnBox');
  setupAttnToggle('importAttnBtn', 'importAttnBox');
  setupAttnToggle('fauxAttnBtn', 'fauxAttnBox');

  $('importOpen').hidden = options;
  $('importControls').hidden = !options;
  $('importOpen').onclick = () => chrome.runtime.openOptionsPage();
  $('fontFile').onchange = importFile;

  $('codeFont').onchange = () => {
    settings.codeFamily = $('codeFont').value;
    save();
  };
  $('codeLigatures').onchange = () => {
    settings.codeLigatures = $('codeLigatures').value;
    save();
  };

  $('krFont').onchange = () => {
    settings.krFont = $('krFont').value;
    save();
  };
  $('cnFont').onchange = () => {
    settings.cnFont = $('cnFont').value;
    save();
  };
  $('jpFont').onchange = () => {
    settings.jpFont = $('jpFont').value;
    save();
  };

  $('importList').onchange = () => {
    $('deleteFont').disabled = !$('importList').value;
  };
  $('deleteFont').onclick = async () => {
    const id = $('importList').value;
    if (!id) return;
    imported = imported.filter(f => f.id !== id);
    if (settings.family === id) {
      settings.family = '';
      settings.varWeightEnabled = false;
      settings.fauxWeightEnabled = false;
    }
    if (settings.codeFamily === id) settings.codeFamily = '';
    if (settings.krFont === id) settings.krFont = '';
    if (settings.cnFont === id) settings.cnFont = '';
    if (settings.jpFont === id) settings.jpFont = '';
    varCache.delete(id);
    viCache.delete(id);
    await chrome.storage.local.set({ settings, importedFonts: imported });
    await FontGlassFonts.deleteBinaryFont(id);
    render();
    status('saved');
  };

  $('applyNow').onclick = applyCurrent;
  $('applyNow').hidden = options;

  render();
  if (!host && !options) status('restricted');

  $('enabled').onchange = () => {
    settings.enabled = $('enabled').checked;
    save();
  };

  $('fontSearch').onfocus = expandFontList;
  $('fontSearch').onclick = expandFontList;
  $('fontSearch').oninput = () => {
    renderFonts();
    expandFontList();
  };
  $('fontSearch').onkeydown = e => {
    const select = $('fontList');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (select.selectedIndex < select.options.length - 1) {
        select.selectedIndex++;
        applySelectedFont();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (select.selectedIndex > 0) {
        select.selectedIndex--;
        applySelectedFont();
      }
    } else if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      collapseFontList();
      $('fontSearch').blur();
    }
  };

  $('fontPicker').addEventListener('focusout', e => {
    if (!$('fontPicker').contains(e.relatedTarget)) {
      collapseFontList();
    }
  });

  $('fontList').onchange = () => {
    applySelectedFont();
    collapseFontList();
  };
  $('fontList').addEventListener('click', e => {
    if (e.target.tagName === 'OPTION') {
      collapseFontList();
    }
  });

  $('sizeMode').onchange = () => {
    settings.sizeMode = $('sizeMode').value;
    render();
    save();
  };

  const handleSizeInput = commit => {
    const v = Number($('sizeValue').value);
    const min = Number($('sizeValue').min);
    const max = Number($('sizeValue').max);
    if (!$('sizeValue').value || !Number.isFinite(v) || v < min || v > max) {
      if (commit) {
        status('sizeError', true);
        render();
      }
      return;
    }
    settings[settings.sizeMode === 'fixed' ? 'fixed' : 'scale'] = v;
    if (commit) save();
    else scheduleSave(180);
  };
  $('sizeValue').oninput = () => handleSizeInput(false);
  $('sizeValue').onchange = () => handleSizeInput(true);

  $('italic').onchange = () => {
    settings.italic = $('italic').value;
    save();
  };

  $('varWeightEnabled').onchange = () => {
    if (!detectVarWeight(settings.family)) {
      $('varWeightEnabled').checked = false;
      settings.varWeightEnabled = false;
      updateWeightControlsUI();
      return;
    }
    settings.varWeightEnabled = $('varWeightEnabled').checked;
    save();
  };

  $('varWeight').oninput = () => {
    if (!detectVarWeight(settings.family)) return;
    settings.varWeightEnabled = true;
    settings.varWeight = Number($('varWeight').value) || 400;
    $('varWeightEnabled').checked = true;
    $('varWeightValue').textContent = String(settings.varWeight);
    scheduleSave(120);
  };

  $('fauxWeightEnabled').onchange = () => {
    if (!settings.family || detectVarWeight(settings.family)) {
      $('fauxWeightEnabled').checked = false;
      settings.fauxWeightEnabled = false;
      updateWeightControlsUI();
      return;
    }
    settings.fauxWeightEnabled = $('fauxWeightEnabled').checked;
    if (settings.fauxWeightEnabled) {
      $('fauxAttnBox').hidden = false;
      $('fauxAttnBtn').setAttribute('aria-expanded', 'true');
    }
    save();
  };

  $('fauxWeight').oninput = () => {
    if (!settings.family || detectVarWeight(settings.family)) return;
    settings.fauxWeightEnabled = true;
    settings.fauxWeight = Number($('fauxWeight').value) || 400;
    $('fauxWeightEnabled').checked = true;
    $('fauxAttnBox').hidden = false;
    $('fauxAttnBtn').setAttribute('aria-expanded', 'true');
    $('fauxWeightValue').textContent = formatFauxBadge(settings.fauxWeight, true);
    scheduleSave(120);
  };

  $('language').onchange = async () => {
    prefs.lang = $('language').value;
    render();
    $('status').textContent = '';
    await chrome.storage.local.set({ prefs });
  };
  $('theme').onclick = async () => {
    prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark';
    render();
    await chrome.storage.local.set({ prefs });
  };
  $('scan').onclick = scanLocal;
  $('fallback').onclick = scanFallback;
  $('openOptions').onclick = () => chrome.runtime.openOptionsPage();
  $('siteToggle').onclick = () => {
    settings.excluded = settings.excluded.includes(host)
      ? settings.excluded.filter(h => h !== host)
      : [...settings.excluded, host];
    render();
    save();
  };

  $('reset').onclick = () => {
    settings = { ...defaults, excluded: [] };
    $('fontSearch').value = '';
    collapseFontList();
    resetJustDone = true;
    clearTimeout(resetFlashTimer);
    resetFlashTimer = setTimeout(() => {
      resetJustDone = false;
      updateResetUI();
    }, 2600);
    render();
    save('resetStatus');
  };

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.settings) settings = { ...defaults, ...changes.settings.newValue };
    if (changes.importedFonts) imported = changes.importedFonts.newValue || [];
    if (changes.fontCache) {
      fonts = changes.fontCache.newValue?.fonts || [];
      localAxes = changes.fontCache.newValue?.axes || {};
      source = changes.fontCache.newValue?.source || '';
    }
    if (changes.prefs) prefs = { ...prefs, ...changes.prefs.newValue };
    render();
  });
}

async function importFile() {
  const file = $('fontFile').files[0];
  if (!file) return;
  $('fontFile').disabled = true;
  status('importing');
  try {
    if (!/\.(ttf|otf|woff2?)$/i.test(file.name) || file.size > 20 * 1024 * 1024 || file.size === 0) {
      throw Error('format/size');
    }
    const current = (await chrome.storage.local.get('importedFonts')).importedFonts || [];
    if (current.reduce((n, f) => n + f.bytes, 0) + file.size > 50 * 1024 * 1024) {
      throw Error('total');
    }
    const buffer = await file.arrayBuffer();
    const id = 'FGImported_' + crypto.randomUUID().replaceAll('-', '');
    const face = new FontFace(id, buffer, { weight: '100 900' });
    await face.load();
    document.fonts.add(face);

    let axes = await FontGlassFonts.inspectAxes(buffer);
    if (axes === null) {
      const probed = probeVariableWeightDOM(id);
      axes = probed ? { wght: probed } : {};
    }

    await FontGlassFonts.putBinaryFont(id, buffer);
    imported = [...current, { id, name: file.name, bytes: file.size, axes }];
    await chrome.storage.local.set({ importedFonts: imported });
    renderFonts();
    preview();
    status('importDone');
  } catch {
    status('importError', true);
  } finally {
    $('fontFile').disabled = false;
    $('fontFile').value = '';
  }
}

init().catch(() => status('error', true));
