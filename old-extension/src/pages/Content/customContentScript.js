(function () {
  function readShopify() {
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
        themeRename: t.name || '',
        schemaName: t.schema_name || '',
        schemaVersion: t.schema_version || '',
        themeId: t.id,
        themeStoreId: t.theme_store_id,
      };
    } catch (e) {
      return { isShopify: false };
    }
  }

  function post() {
    window.postMessage(
      {
        __EZFY_SHOPIFY_THEME__: true,
        payload: readShopify(),
      },
      '*'
    );
  }

  post();
  setTimeout(post, 100);
  setTimeout(post, 350);
})();
