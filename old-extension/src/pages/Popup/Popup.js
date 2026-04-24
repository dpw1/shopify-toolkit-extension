import React, { useState, useEffect } from 'react';
import logo from '../../assets/img/ezfy-logo-small.png';
import { getProductsFromCategory } from '../Content/modules/utils';
import './Popup.scss';
import ThemeDetails from './ThemeDetails';
import AppsDetails from './AppsDetails';
import ProductRecommendations from './ProductRecommendations';
import Footer from './Footer';
import ScriptsDetails from './ScriptsDetails';
import {
  resolveThemeFromShopifyName,
  buildFallbackThemeRecord,
} from '../Content/modules/detectTheme';
import { getTotalApps } from '../Content/modules/detectApps';

/**
 * Runs in the page MAIN world. Shopify detection = `window.Shopify` exists.
 */
function readShopifyFromPageMainWorld() {
  try {
    if (!window.Shopify) {
      return { isShopify: false };
    }
    var Shopify = window.Shopify;
    var shop = Shopify.shop;
    if (typeof shop !== 'string') {
      shop = shop && shop.domain ? shop.domain : '';
    }
    var t = Shopify.theme || {};
    return {
      isShopify: true,
      shop: shop || '',
      /** Theme folder / admin "rename" (e.g. sami_130326) */
      themeRename: t.name || '',
      /** Real theme identity for matching + display (e.g. Horizon) */
      schemaName: t.schema_name || '',
      schemaVersion: t.schema_version || '',
      themeId: t.id,
      themeStoreId: t.theme_store_id,
    };
  } catch (e) {
    return { isShopify: false };
  }
}

function isHttpUrl(url) {
  if (!url) return false;
  try {
    var u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function buildDataFromMainWorldOnly(mainP) {
  var candidates = [mainP.schemaName, mainP.themeRename].filter(Boolean);
  var themeObj = null;
  for (var i = 0; i < candidates.length; i++) {
    themeObj = resolveThemeFromShopifyName(candidates[i]);
    if (themeObj) break;
  }
  if (!themeObj) {
    themeObj = buildFallbackThemeRecord(
      mainP.schemaName || mainP.themeRename || 'unknown'
    );
  }
  return {
    theme: themeObj,
    store: {
      shop: mainP.shop,
      theme: mainP.themeRename || '',
      themeNameFromShopify: mainP.schemaName || '',
      version: mainP.schemaVersion || '',
      raw: mainP,
    },
    apps: { apps: [], scripts: [] },
    totalApps: getTotalApps(),
    isShopifyStore: true,
  };
}

function applyMainWorldShopify(fullData, mainP) {
  if (!mainP || !mainP.isShopify) {
    return fullData;
  }
  var candidates = [mainP.schemaName, mainP.themeRename].filter(Boolean);
  var themeObj = null;
  for (var i = 0; i < candidates.length; i++) {
    themeObj = resolveThemeFromShopifyName(candidates[i]);
    if (themeObj) break;
  }
  if (!themeObj) {
    themeObj = mainP.schemaName || mainP.themeRename
      ? buildFallbackThemeRecord(mainP.schemaName || mainP.themeRename)
      : fullData.theme || buildFallbackThemeRecord('unknown');
  }
  return {
    ...fullData,
    theme: themeObj,
    store: {
      ...fullData.store,
      shop: mainP.shop || fullData.store?.shop || '',
      theme: mainP.themeRename || fullData.store?.theme || '',
      themeNameFromShopify:
        mainP.schemaName || fullData.store?.themeNameFromShopify || '',
      version: mainP.schemaVersion || fullData.store?.version || '',
      raw: mainP,
    },
    isShopifyStore: true,
  };
}

async function readMainWorldOnce(tabId) {
  var inj = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    world: 'MAIN',
    func: readShopifyFromPageMainWorld,
  });
  var r = inj && inj[0] ? inj[0].result : null;
  if (!r || typeof r.isShopify !== 'boolean') {
    return { isShopify: false };
  }
  return r;
}

async function readMainWorldFast(tabId) {
  var first = await readMainWorldOnce(tabId);
  if (first.isShopify) {
    return first;
  }
  await new Promise(function (r) {
    setTimeout(r, 50);
  });
  return readMainWorldOnce(tabId);
}

const Popup = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [products, setProducts] = useState(null);

  useEffect(() => {
    (async function load() {
      try {
        var tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        var tab = tabs[0];
        if (!tab || !tab.id || !isHttpUrl(tab.url)) {
          setData({ loadError: true });
          return;
        }

        var mainP;
        var fullData;
        try {
          var results = await Promise.all([
            readMainWorldFast(tab.id),
            new Promise(function (resolve) {
              chrome.tabs.sendMessage(
                tab.id,
                { type: 'getShopifyData' },
                function (response) {
                  if (chrome.runtime.lastError) {
                    resolve(null);
                  } else {
                    resolve(response || null);
                  }
                }
              );
            }),
          ]);
          mainP = results[0];
          fullData = results[1];
        } catch (e) {
          console.warn(e);
          setData({ loadError: true });
          return;
        }

        if (!mainP.isShopify) {
          setData({ isShopifyStore: false });
          return;
        }

        if (fullData) {
          setData(applyMainWorldShopify(fullData, mainP));
          return;
        }

        setData(buildDataFromMainWorldOnly(mainP));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (
      data &&
      data.hasOwnProperty('theme') &&
      data.theme &&
      data.theme.hasOwnProperty('name')
    ) {
      const getUpsellProducts = async () => {
        try {
          const products = await getProductsFromCategory(data.theme.name);

          setProducts(products);
        } catch (err) {
          setProducts([]);
        }
      };

      getUpsellProducts();
    }
  }, [data]);

  if (loading) {
    return (
      <div className="Popup">
        <p className="Popup-message">Loading…</p>
      </div>
    );
  }

  return (
    <div className="Popup">
      {data && data.loadError ? (
        <p className="Popup-error">
          Open a normal web page (http/https) and try again, or reload the
          extension after an update.
        </p>
      ) : data && data.isShopifyStore === false ? (
        <>
          <p className="Popup-message">
            This page does not expose <code>window.Shopify</code>, so it is not
            detected as a Shopify storefront.
          </p>
          <Footer></Footer>
        </>
      ) : data && data.isShopifyStore ? (
        <>
          <header>
            <img className="Popup-logo" src={logo} alt="" />
            <h1 className="Popup-title">Shopify App Detector</h1>
            <a
              className="Popup-link"
              target="_blank"
              rel="noreferrer"
              href="https://ezfycode.com"
            ></a>
          </header>
          <ThemeDetails
            className="Popup-item"
            products={products}
            data={data}
            isInvalid={data.theme && data.theme.name === 'unknown'}
          ></ThemeDetails>

          {data.hasOwnProperty('apps') &&
            data.apps &&
            data.apps.hasOwnProperty('apps') &&
            data.apps.apps.length >= 0 && (
              <AppsDetails
                className="Popup-item"
                apps={data.apps}
                total={data.totalApps}
              ></AppsDetails>
            )}

          <ProductRecommendations
            className="Popup-item"
            theme={data.theme && data.theme.name}
            products={products}
          ></ProductRecommendations>

          {data.hasOwnProperty('apps') &&
            data.apps &&
            data.apps.hasOwnProperty('scripts') &&
            data.apps.scripts.length >= 0 && (
              <ScriptsDetails
                className="Popup-item"
                apps={data.apps}
              ></ScriptsDetails>
            )}
          <Footer></Footer>
        </>
      ) : (
        <p className="Popup-error">
          Something went wrong. Try refreshing the page.
        </p>
      )}
    </div>
  );
};

export default Popup;
