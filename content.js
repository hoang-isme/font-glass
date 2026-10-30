(() => {
  'use strict';
  if (globalThis.__fontGlassLoaded) return;
  globalThis.__fontGlassLoaded = true;

  const mark = 'data-font-glass-target';
  const shield = 'data-font-glass-preserve';
  const fontCSS = document.createElement('style');
  const sizeCSS = document.createElement('style');
  fontCSS.id = 'font-glass-styles';
  sizeCSS.id = 'font-glass-sizes';

  const deadTree = 'script,style,noscript,svg,math,canvas,iframe,object,embed,head,meta,link,audio,video,picture,source,track';
  const skipped = 'script,style,noscript,svg,math,canvas,pre,code,kbd,samp,textarea,[contenteditable]:not([contenteditable="false"]),[role="img"],[aria-hidden="true"]';
  const icon = /icon|awesome|material\s*(symbols|icons)|glyph|wingdings|webdings|symbol|codicon|octicon|feather|nerdfont|nerd\s*font|phosphor|tabler|lucide|remixicon/i;
  const textTags = 'body,div,span,p,a,li,ul,ol,dl,dt,dd,h1,h2,h3,h4,h5,h6,label,button,input,select,option,summary,details,blockquote,td,th,caption,legend,small,strong,b,em,i,section,article,main,header,footer,nav,aside,time,output';

  const krDomains = /(^|\.)(kr|naver\.com|daum\.net|kakao\.com|dcinside\.com|fmkorea\.com|ruliweb\.com|inven\.co\.kr|clien\.net|theqoo\.net|nate\.com|arca\.live|namu\.wiki|ppomppu\.co\.kr|dogdrip\.net|instiz\.net|velog\.io|tistory\.com)$/i;
  const cnDomains = /(^|\.)(cn|tw|hk|mo|weibo\.com|baidu\.com|zhihu\.com|bilibili\.com|qq\.com|163\.com|sina\.com\.cn|sohu\.com|nga\.cn|hupu\.com|douban\.com|xiaohongshu\.com|ptt\.cc|gamer\.com\.tw|mobile01\.com|LIHKG\.com|discuss\.com\.hk|juejin\.cn|csdn\.net)$/i;
  const jpDomains = /(^|\.)(jp|5ch\.net|2ch\.sc|qiita\.com|zenn\.dev|note\.com|nicovideo\.jp|pixiv\.net|ameblo\.jp|livedoor\.com|hatena\.ne\.jp|nhk\.or\.jp|asahi\.com|mainichi\.jp|yomiuri\.co\.jp|kakaku\.com|girlschannel\.net|bakusai\.com)$/i;

  let settings = {};
  let key = '';
  let observer;
  let timer = 0;
  let resizeTimer = 0;
  let cache = new WeakMap();
  let groups = new Map();
  let shieldGroups = new Map();
  const pending = new Set();

  const selector = (attr, id) => `html body [${attr}="${id}"][${attr}],html body[${attr}="${id}"]`;

  function topHost() {
    if (location.ancestorOrigins?.length) {
      try {
        return new URL(location.ancestorOrigins[location.ancestorOrigins.length - 1]).hostname || location.hostname;
      } catch {}
    }
    try {
      return window.top.location.hostname || location.hostname;
    } catch {
      try {
        return new URL(document.referrer).hostname || location.hostname;
      } catch {
        return location.hostname;
      }
    }
  }

  // Detects if the current webpage is Korean ('kr'), Chinese ('cn'), or Japanese ('jp')
  function detectCJKRegion() {
    const host = topHost();
    if (krDomains.test(host) || krDomains.test(location.hostname)) return 'kr';
    if (jpDomains.test(host) || jpDomains.test(location.hostname)) return 'jp';
    if (cnDomains.test(host) || cnDomains.test(location.hostname)) return 'cn';

    const rawLang = (
      document.documentElement?.getAttribute('lang') ||
      document.documentElement?.getAttribute('xml:lang') ||
      document.body?.getAttribute('lang') ||
      ''
    ).trim().toLowerCase();
    if (/^ko\b/.test(rawLang)) return 'kr';
    if (/^ja\b/.test(rawLang)) return 'jp';
    if (/^zh\b/.test(rawLang)) return 'cn';

    // Fallback for generic .com/.net domains without [lang]
    const sample = (document.title + ' ' + (document.body?.innerText || '').slice(0, 1200)).slice(0, 1300);
    if (sample.length >= 12) {
      const hangul = (sample.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || []).length;
      if (hangul >= 12) return 'kr';
      const kana = (sample.match(/[\u3040-\u30FF\u31F0-\u31FF]/g) || []).length;
      if (kana >= 10) return 'jp';
      const han = (sample.match(/[\u4E00-\u9FFF]/g) || []).length;
      if (han >= 20 && kana < 3 && hangul < 3) return 'cn';
    }
    return '';
  }

  function resolveActiveFamily() {
    const region = detectCJKRegion();
    if (region === 'kr' && settings.krFont) return { family: settings.krFont, isRegional: true, region: 'kr' };
    if (region === 'cn' && settings.cnFont) return { family: settings.cnFont, isRegional: true, region: 'cn' };
    if (region === 'jp' && settings.jpFont) return { family: settings.jpFont, isRegional: true, region: 'jp' };
    return { family: settings.family || '', isRegional: false, region };
  }

  // Generates a robust, multi-name font-family stack ensuring Windows/macOS/Linux
  // matches Chinese/Japanese/Korean fonts by English, native Chinese/Kana/Hangul, PostScript names,
  // plus safe regional sans-serif fallbacks so text never drops to random mismatched fonts.
  function buildFamilyStack(fontName, region) {
    if (!fontName) return '';
    const names = new Set();
    names.add(fontName);

    // 1. Check metadata passed from UI scanner (fullName, postscriptName)
    const meta = settings.fontMeta?.[fontName];
    if (meta?.fullName) names.add(meta.fullName);
    if (meta?.postscriptName) names.add(meta.postscriptName);

    // 2. Known CJK alias bridges (covers Founder Type, Hanyi, Apple/Windows dual-name fonts)
    const lower = fontName.toLowerCase();
    if (lower.includes('fzzhenghei') || fontName.includes('正黑') || lower.includes('fzzh')) {
      names.add('方正正黑');
      names.add('方正正粗黑_GBK');
      names.add('方正正中黑_GBK');
      names.add('方正正大黑_GBK');
      names.add('方正正粗黑');
      names.add('方正正中黑');
      names.add('FZZhengHei-B-GBK');
      names.add('FZZhengHei-DB-GBK');
      names.add('FZZhengHei-EB-GBK');
    } else if (lower.includes('fzhei') || fontName.includes('方正黑体') || lower.includes('fzht')) {
      names.add('方正黑体');
      names.add('方正黑体_GBK');
    } else if (lower.includes('fzlanting') || fontName.includes('兰亭')) {
      names.add('方正兰亭黑');
      names.add('方正兰亭黑_GBK');
      names.add('FZLanTingHei-R-GBK');
    } else if (lower.includes('fzkai') || fontName.includes('楷体')) {
      names.add('方正楷体');
      names.add('方正楷体_GBK');
    }

    if (lower.includes('hiragino') || fontName.includes('ヒラギノ')) {
      names.add('Hiragino Sans');
      names.add('Hiragino Kaku Gothic ProN');
      names.add('ヒラギノ角ゴ ProN');
      names.add('ヒラギノ角ゴシック');
      names.add('Hiragino Sans GB');
    } else if (lower.includes('meiryo') || fontName.includes('メイリオ')) {
      names.add('Meiryo');
      names.add('メイリオ');
    } else if (lower.includes('yu gothic') || fontName.includes('游ゴシック') || lower.includes('yugothic')) {
      names.add('Yu Gothic');
      names.add('游ゴシック');
      names.add('YuGothic');
    }

    if (lower.includes('malgun') || fontName.includes('맑은')) {
      names.add('Malgun Gothic');
      names.add('맑은 고딕');
    } else if (lower.includes('pretendard')) {
      names.add('Pretendard');
      names.add('Pretendard Variable');
    } else if (lower.includes('nanum') || fontName.includes('나눔')) {
      names.add('NanumGothic');
      names.add('나눔고딕');
    }

    // 3. Append language-specific native system fallbacks
    const formatted = [...names].map(n => JSON.stringify(n));
    if (region === 'cn') {
      formatted.push(
        '"PingFang SC"',
        '"Hiragino Sans GB"',
        '"Microsoft YaHei"',
        '"微软雅黑"',
        '"Source Han Sans SC"',
        '"Noto Sans SC"',
        '"SimHei"'
      );
    } else if (region === 'jp') {
      formatted.push(
        '"Hiragino Sans"',
        '"Hiragino Kaku Gothic ProN"',
        '"ヒラギノ角ゴ ProN"',
        '"Meiryo"',
        '"メイリオ"',
        '"Yu Gothic"',
        '"游ゴシック"',
        '"Source Han Sans JP"',
        '"Noto Sans JP"'
      );
    } else if (region === 'kr') {
      formatted.push(
        '"Pretendard"',
        '"Malgun Gothic"',
        '"맑은 고딕"',
        '"Apple SD Gothic Neo"',
        '"Source Han Sans KR"',
        '"Noto Sans KR"'
      );
    }
    formatted.push('sans-serif');
    return formatted.join(',');
  }

  function allowed() {
    if (!settings.enabled) return false;
    const ex = settings.excluded;
    if (!Array.isArray(ex) || !ex.length) return true;
    return !ex.includes(topHost()) && !ex.includes(location.hostname);
  }

  function codeLigatureCSS() {
    if (settings.codeLigatures === 'normal') {
      return 'font-variant-ligatures:normal!important;font-feature-settings:"liga" 1,"calt" 1!important;';
    }
    if (settings.codeLigatures === 'none') {
      return 'font-variant-ligatures:none!important;font-feature-settings:"liga" 0,"calt" 0!important;';
    }
    return '';
  }

  function fauxWeightCSS() {
    if (!settings.fauxWeightEnabled) return '';
    const w = Number(settings.fauxWeight);
    if (!Number.isFinite(w) || w < 100 || w > 900) return '';
    if (w === 400) {
      return 'font-weight:400!important;font-synthesis:weight style!important;';
    }
    if (w > 400) {
      const stroke = ((w - 400) / 950).toFixed(3);
      return `font-weight:${Math.round(w)}!important;font-synthesis:weight style!important;-webkit-text-stroke:${stroke}px currentColor!important;`;
    }
    // Thinner simulation (< 400)
    const lightAlpha = ((400 - w) / 450).toFixed(2);
    return `font-weight:${Math.round(w)}!important;font-synthesis:none!important;-webkit-font-smoothing:antialiased!important;text-rendering:geometricPrecision!important;opacity:${Math.max(0.78, 1 - Number(lightAlpha) * 0.16).toFixed(2)};`;
  }

  function typography() {
    const active = resolveActiveFamily();
    return !!(
      active.family ||
      settings.codeFamily ||
      settings.codeLigatures === 'normal' ||
      settings.codeLigatures === 'none' ||
      settings.sizeMode === 'scale' ||
      settings.sizeMode === 'fixed' ||
      ['normal', 'italic'].includes(settings.italic)
    );
  }

  function mount(sheet) {
    if (!sheet.isConnected) (document.head || document.documentElement).append(sheet);
  }

  function clear() {
    fontCSS.remove();
    sizeCSS.remove();
    document.querySelectorAll(`[${mark}],[${shield}]`).forEach(el => {
      el.removeAttribute(mark);
      el.removeAttribute(shield);
    });
    cache = new WeakMap();
    groups = new Map();
    shieldGroups = new Map();
    pending.clear();
  }

  function rule(sheet, css) {
    sheet.sheet.insertRule(css, sheet.sheet.cssRules.length);
  }

  function observe() {
    observer.observe(document.documentElement, { subtree: true, childList: true });
  }

  function hasDirectText(el) {
    for (let n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    }
    return false;
  }

  function process(elements) {
    if (!allowed() || !typography()) return;
    observer.disconnect();
    try {
      const relative = settings.sizeMode === 'scale';
      const fixed = settings.sizeMode === 'fixed';
      const needSize = relative || fixed;
      if (relative) sizeCSS.disabled = true;

      const reads = [];
      for (const el of elements) {
        if (!el.isConnected || cache.has(el) || el.matches(deadTree) || el.closest(deadTree)) continue;
        const cs = getComputedStyle(el);
        reads.push([el, {
          family: cs.fontFamily,
          size: needSize ? cs.fontSize : '',
          italic: cs.fontStyle
        }]);
      }

      if (relative) sizeCSS.disabled = false;

      const codeLig = codeLigatureCSS();
      for (const [el, data] of reads) {
        cache.set(el, data);
        const excluded = el.closest(skipped);
        const primaryFont = data.family.split(',')[0].replace(/["']/g, '').trim();
        const isIcon = icon.test(primaryFont);

        if (excluded || isIcon) {
          if (isIcon || (el.matches(skipped) && !el.parentElement?.closest(skipped))) {
            const isCode = el.matches('pre,code,kbd,samp');
            const targetFam = isCode && settings.codeFamily
              ? `${JSON.stringify(settings.codeFamily)},monospace`
              : data.family;
            const ligRule = isCode ? codeLig : '';
            const sKey = `${targetFam}|${data.italic}|${ligRule}|${needSize ? data.size : ''}`;
            let sId = shieldGroups.get(sKey);
            if (sId === undefined) {
              sId = String(shieldGroups.size);
              shieldGroups.set(sKey, sId);
              rule(fontCSS, `${selector(shield, sId)}{font-family:${targetFam}!important;font-style:${data.italic}!important;font-variation-settings:normal!important;-webkit-text-stroke:0!important;${ligRule}}`);
              if (needSize && data.size) {
                rule(sizeCSS, `${selector(shield, sId)}{font-size:${data.size}!important;}`);
              }
            }
            el.setAttribute(shield, sId);
          }
          continue;
        }

        if (!el.matches(textTags) && !hasDirectText(el)) continue;
        if (el.matches('input') && !/^(text|search|email|url|tel|password|number|button|submit|reset)$/.test(el.type)) continue;

        let size = '';
        if (relative) {
          size = (parseFloat(data.size) * Math.min(200, Math.max(50, Number(settings.scale) || 100)) / 100).toFixed(3) + 'px';
        } else if (fixed) {
          size = Math.min(72, Math.max(8, Number(settings.fixed) || 16)) + 'px';
        }

        let id = groups.get(size);
        if (id === undefined) {
          id = String(groups.size);
          groups.set(size, id);
          if (size) rule(sizeCSS, `${selector(mark, id)}{font-size:${size}!important;}`);
        }
        el.setAttribute(mark, id);
      }
    } finally {
      sizeCSS.disabled = false;
      if (allowed()) observe();
    }
  }

  function full(force = false) {
    const active = resolveActiveFamily();
    const next = JSON.stringify({ settings, activeFamily: active.family });
    if (!force && key === next) return;
    key = next;
    observer.disconnect();
    clear();
    if (!allowed() || !typography()) return;

    const chosenFamily = active.family;
    const fontStack = buildFamilyStack(chosenFamily, active.region);
    const family = fontStack ? `font-family:${fontStack}!important;` : '';
    const italic = ['normal', 'italic'].includes(settings.italic) ? `font-style:${settings.italic}!important;` : '';

    let weightCSS = '';
    const weightNum = Number(settings.varWeight);
    if (chosenFamily && !active.isRegional && settings.varWeightEnabled && Number.isFinite(weightNum) && weightNum >= 50 && weightNum <= 1000) {
      weightCSS = `font-variation-settings:"wght" ${weightNum}!important;font-weight:${Math.round(weightNum)}!important;`;
    } else if (chosenFamily && !active.isRegional && settings.fauxWeightEnabled) {
      weightCSS = fauxWeightCSS();
    }

    fontCSS.textContent = `html body [${mark}][${mark}],html body[${mark}]{${family}${italic}${weightCSS}}`;

    const codeFam = settings.codeFamily ? `font-family:${JSON.stringify(settings.codeFamily)},monospace!important;` : '';
    const codeLig = codeLigatureCSS();
    if (codeFam || codeLig) {
      fontCSS.textContent += `html body :is(pre,code,kbd,samp),html body :is(pre,code,kbd,samp) *:not([${shield}]){${codeFam}${codeLig}-webkit-text-stroke:0!important;}`;
    }

    if (/(^|\.)youtube\.com$/.test(location.hostname) && chosenFamily) {
      fontCSS.textContent += `html body :is(ytd-searchbox,yt-searchbox,.ytSearchboxComponentInputBox) input,html body input[name="search_query"]{${family}${italic}${weightCSS}}`;
    }

    sizeCSS.textContent = '';
    mount(fontCSS);
    mount(sizeCSS);
    if (document.body) {
      process(document.querySelectorAll('body,body *'));
    }
  }

  function enqueue(nodes) {
    for (const node of nodes) {
      if (node.nodeType === 1 && !node.matches(deadTree)) pending.add(node);
    }
    if (timer || !pending.size) return;
    timer = requestAnimationFrame(() => {
      timer = 0;
      const els = new Set();
      for (const node of pending) {
        if (!node.isConnected || node.matches(deadTree) || node.closest(deadTree)) continue;
        els.add(node);
        node.querySelectorAll('*').forEach(el => {
          if (!el.matches(deadTree)) els.add(el);
        });
      }
      pending.clear();
      if (els.size) process(els);
    });
  }

  observer = new MutationObserver(records => {
    for (const r of records) {
      if (r.addedNodes.length) enqueue(r.addedNodes);
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type !== 'font-glass-refresh') return;
    reload()
      .then(() => {
        respond({
          ok: true,
          targets: document.querySelectorAll(`[${mark}]`).length,
          enabled: allowed(),
          region: detectCJKRegion(),
          activeFamily: resolveActiveFamily().family
        });
      })
      .catch(error => respond({ ok: false, error: String(error) }));
    return true;
  });

  const defaults = {
    enabled: true,
    family: '',
    sizeMode: 'original',
    italic: 'original',
    varWeightEnabled: false,
    varWeight: 400,
    fauxWeightEnabled: false,
    fauxWeight: 400,
    codeFamily: '',
    codeLigatures: 'original',
    krFont: '',
    cnFont: '',
    jpFont: ''
  };
  let loadEpoch = 0;

  async function reload() {
    const epoch = ++loadEpoch;
    const data = await chrome.storage.local.get(['settings', 'importedFonts']);
    const next = { ...defaults, ...data.settings };
    delete next.oled;
    await FontGlassFonts.sync(
      data.importedFonts || [],
      next.enabled ? [next.family, next.codeFamily, next.krFont, next.cnFont, next.jpFont] : []
    );
    if (epoch !== loadEpoch) return;
    settings = next;
    full();
  }

  reload().catch(console.error);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.settings || changes.importedFonts)) {
      reload().catch(console.error);
    }
  });

  window.addEventListener(
    'resize',
    () => {
      if (settings.sizeMode !== 'scale') return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => full(true), 250);
    },
    { passive: true }
  );
})();
