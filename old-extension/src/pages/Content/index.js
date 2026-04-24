import detectTheme, {
  resolveThemeFromShopifyName,
  buildFallbackThemeRecord,
} from './modules/detectTheme';
import { getBoomrObject, _extractTextBetween } from './modules/utils';

import { detectApps, getTotalApps } from './modules/detectApps';

/** Latest page-context read: { isShopify, shop, themeName, ... } */
let pageShopifyPayload = undefined;

window.addEventListener('message', function (event) {
  if (event.source !== window) return;
  if (!event.data || !event.data.__EZFY_SHOPIFY_THEME__) return;
  pageShopifyPayload = event.data.payload;
});

function waitForPageShopifyHint(maxMs) {
  return new Promise(function (resolve) {
    if (pageShopifyPayload !== undefined) {
      resolve();
      return;
    }
    var start = Date.now();
    var id = setInterval(function () {
      if (pageShopifyPayload !== undefined || Date.now() - start > maxMs) {
        clearInterval(id);
        resolve();
      }
    }, 10);
  });
}

function getshopifyWindowObject() {
  var $scripts = document.querySelectorAll(
    `head > script:not([class]):not([id]), body > script:not([class]):not([id])`
  );

  for (var each of $scripts) {
    var html = each.innerHTML;
    var isShopifyObject = /shopify\.shop/gim.test(html.toLowerCase());

    if (isShopifyObject) {
      return html;
    }
  }

  return null;
}

function getBoomrVersionSafe() {
  try {
    return getBoomrObject().version;
  } catch (e) {
    return '';
  }
}

function getShopifyStore() {
  if (pageShopifyPayload && pageShopifyPayload.isShopify) {
    var p = pageShopifyPayload;
    return {
      shop: p.shop || '',
      theme: p.themeRename || p.themeName || '',
      themeNameFromShopify: p.schemaName || '',
      version: p.schemaVersion || p.themeVersion || getBoomrVersionSafe(),
      raw: p,
    };
  }

  try {
    const store = getshopifyWindowObject();

    if (!store) {
      return null;
    }

    const shop = _extractTextBetween(store, `Shopify.shop = "`, `";`);
    const theme = _extractTextBetween(store, `Shopify.theme = {"name":"`, `",`);
    const version = getBoomrVersionSafe();

    return {
      shop,
      theme,
      themeNameFromShopify: theme,
      version,
    };
  } catch (err) {
    return null;
  }
}

function getShopifyTheme() {
  const store = getShopifyStore();
  if (!store) {
    return buildFallbackThemeRecord('unknown');
  }

  const candidates = [
    store.themeNameFromShopify,
    store.raw && store.raw.schemaName,
    store.theme,
    store.raw && store.raw.themeRename,
  ].filter(Boolean);

  for (var i = 0; i < candidates.length; i++) {
    const resolved = resolveThemeFromShopifyName(candidates[i]);
    if (resolved) return resolved;
  }

  const domTheme = detectTheme();
  if (domTheme && domTheme.name && domTheme.name !== 'unknown') {
    return domTheme;
  }

  const displayName = candidates[0];
  if (displayName) {
    return buildFallbackThemeRecord(displayName);
  }

  return domTheme && domTheme.name ? domTheme : buildFallbackThemeRecord('unknown');
}

function getShopifyApps() {
  if (!isShopifyStore()) {
    return { apps: [], scripts: [] };
  }

  try {
    return detectApps();
  } catch (e) {
    return { apps: [], scripts: [] };
  }
}

function isShopifyStore() {
  if (pageShopifyPayload && typeof pageShopifyPayload.isShopify === 'boolean') {
    return pageShopifyPayload.isShopify;
  }
  return false;
}

function generateStoreData() {
  const theme = getShopifyTheme();
  let store = getShopifyStore();
  const apps = getShopifyApps();

  if (!store && isShopifyStore()) {
    store = { shop: '', theme: '', themeNameFromShopify: '', version: '' };
  }

  return {
    theme,
    store,
    apps,
    totalApps: getTotalApps(),
    isShopifyStore: isShopifyStore(),
  };
}

const evtToPage = chrome.runtime.id;
const evtFromPage = chrome.runtime.id + '-response';

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === 'getShopifyData') {
    waitForPageShopifyHint(200).then(function () {
      sendResponse(generateStoreData());
    });
    return true;
  }

  if (message.type === 'getConfig') {
    addEventListener(
      evtFromPage,
      function (e) {
        sendResponse(e);
      },
      { once: true }
    );
    dispatchEvent(new Event(evtToPage));
  }
});

const script = document.createElement('script');

script.src = chrome.runtime.getURL('customContentScript.bundle.js');

script.dataset.args = JSON.stringify({ evtToPage, evtFromPage });
document.documentElement.appendChild(script);
