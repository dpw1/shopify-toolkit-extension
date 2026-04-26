
(async function () {
    const APPS_JSON_URL = "https://pandatests.myshopify.com/cdn/shop/t/70/assets/apps.json";
  
    async function loadAppCatalog() {
      const response = await fetch(APPS_JSON_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to fetch app catalog: " + response.status + " " + response.statusText);
      }
  
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Invalid app catalog format: expected an array");
      }
      return data;
    }
  
    function getAppName(app) {
      return app.appTitle || app.name || (app.id != null ? "App #" + app.id : "Unknown App");
    }
  
    function getAppCategory(app) {
      if (typeof app.category === "string" && app.category.trim() !== "") return app.category;
      if (typeof app.categoriesJson === "string" && app.categoriesJson.trim() !== "") {
        try {
          const parsed = JSON.parse(app.categoriesJson);
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
            return parsed[0];
          }
        } catch (_) {}
      }
      return "Uncategorized";
    }
  
    function getAppPatterns(app) {
      return Array.isArray(app.patterns) ? app.patterns : [];
    }
  
    function getAppKey(app) {
      if (app.id != null) return String(app.id);
      return getAppName(app);
    }
  
    const appCatalog = await loadAppCatalog();
    const allScripts = Array.from(document.querySelectorAll("script"));
    const allLinks = Array.from(document.querySelectorAll("link[href]"));
  
    const detectedApps = [];
    const detectedByKey = new Map();
  
    function matchCatalogApp(srcOrContent) {
      if (!srcOrContent) return null;
      const lower = String(srcOrContent).toLowerCase();
      for (const app of appCatalog) {
        const patterns = getAppPatterns(app);
        for (const p of patterns) {
          if (lower.indexOf(String(p).toLowerCase()) !== -1) return app;
        }
      }
      return null;
    }
  
    function domDetectionScripts(app) {
      const selectors = Array.isArray(app.domSelectors) ? app.domSelectors : [];
      const parts = [];
      for (const selector of selectors) {
        try {
          const count = document.querySelectorAll(selector).length;
          if (count > 0) parts.push("(DOM: " + count + " x " + selector + ")");
        } catch (_) {}
      }
      return parts;
    }
  
    function getMatchingScriptSrcs(app) {
      const srcs = [];
      const patterns = getAppPatterns(app);
      for (const pattern of patterns) {
        const normalizedPattern = String(pattern).toLowerCase();
        allScripts.forEach((script) => {
          if (script.getAttribute("src") == null) return;
          const src = script.src || "";
          if (!src || src.toLowerCase().indexOf(normalizedPattern) === -1) return;
          srcs.push(src);
        });
        allLinks.forEach((link) => {
          const hrefAttr = link.getAttribute("href");
          if (hrefAttr == null || hrefAttr === "") return;
          const resolved = link.href || "";
          if (resolved.toLowerCase().indexOf(normalizedPattern) === -1 && hrefAttr.toLowerCase().indexOf(normalizedPattern) === -1) {
            return;
          }
          srcs.push(resolved || hrefAttr || "(link)");
        });
      }
      return [...new Set(srcs)];
    }
  
    function addOrMergeDetectedApp(app, scriptsToAdd) {
      const appKey = getAppKey(app);
      const appName = getAppName(app);
      const appCategory = getAppCategory(app);
      const appStoreUrl = app.sourceAppUrl || null;
      const appIconUrl = app.appIconUrl || null;
  
      if (!detectedByKey.has(appKey)) {
        // Keep all source catalog fields so downstream consumers can use
        // full app metadata (reviews, pricing, categories, etc.).
        const entry = {
          ...app,
          id: app.id != null ? app.id : null,
          name: appName,
          category: appCategory,
          sourceAppUrl: appStoreUrl,
          appIconUrl: appIconUrl,
          scripts: [],
        };
        detectedApps.push(entry);
        detectedByKey.set(appKey, entry);
      }
  
      const entry = detectedByKey.get(appKey);
      const existing = new Set(entry.scripts);
      for (const s of scriptsToAdd) {
        if (typeof s === "string" && s !== "" && !existing.has(s)) {
          entry.scripts.push(s);
          existing.add(s);
        }
      }
    }
  
    for (const app of appCatalog) {
      const matchingSrcs = getMatchingScriptSrcs(app);
      const domScripts = domDetectionScripts(app);
      const scripts = matchingSrcs.concat(domScripts);
      if (scripts.length > 0) addOrMergeDetectedApp(app, scripts);
    }
  
    const unknownSrcSet = new Set();
    allScripts.forEach((script) => {
      if (!script.src) return;
      const src = script.src;
      const isShopify =
        src.indexOf("shopify.com") !== -1 &&
        (src.indexOf("extensions") !== -1 || src.indexOf("proxy") !== -1 || src.indexOf("apps") !== -1);
      const hasShop = src.indexOf(".js") !== -1 && src.indexOf("?shop=") !== -1;
      if (!isShopify && !hasShop) return;
      unknownSrcSet.add(src);
    });
  
    unknownSrcSet.forEach((src) => {
      const matchedApp = matchCatalogApp(src);
      if (matchedApp) addOrMergeDetectedApp(matchedApp, [src]);
    });
  
    const sectionStoreCount = document.querySelectorAll(
      "[id*='shopify-section'] > [class*='_ss_'][class*='section-template']"
    ).length;
    if (sectionStoreCount > 0) {
      addOrMergeDetectedApp(
        {
          id: "sections-store-dom",
          appTitle: "Sections Store",
          category: "Page Builders",
        },
        ["(DOM: " + sectionStoreCount + " section-template elements)"]
      );
    }
  
    const totalStylesheets = document.querySelectorAll('link[rel="stylesheet"]').length;
    const headScripts = document.head ? document.head.querySelectorAll("script") : [];
    const bodyScripts = document.body ? document.body.querySelectorAll("script") : [];
  
    const appsObject = {};
    const allDetectedScriptSrcs = new Set();
    detectedApps.forEach((app) => {
      const scripts = Array.isArray(app.scripts) ? app.scripts : [];
      appsObject[app.name] = { ...app, scripts };
      scripts.forEach((src) => {
        if (typeof src === "string" && src.indexOf("http") === 0) {
          allDetectedScriptSrcs.add(src);
        }
      });
    });
  
    const result = {
      url: window.location.href,
      source_apps_url: APPS_JSON_URL,
      catalog_total: appCatalog.length,
      detected_apps: detectedApps,
      apps: appsObject,
      total_detected: detectedApps.length,
      total_head_scripts: headScripts.length,
      total_body_scripts: bodyScripts.length,
      total_scripts: headScripts.length + bodyScripts.length,
      total_stylesheets: totalStylesheets,
      section_store_count: sectionStoreCount,
      detected_script_srcs: Array.from(allDetectedScriptSrcs),
    };
  
    console.log("%c Shopify App Detector — Results", "font-size: 16px; font-weight: bold; color: #96bf48;");
    console.log("────────────────────────────────────────");
    console.log("URL:", result.url);
    console.log("App source:", APPS_JSON_URL);
    console.log("Catalog apps:", result.catalog_total);
    console.log("Apps detected:", result.total_detected);
    console.log("Scripts: head=" + result.total_head_scripts + ", body=" + result.total_body_scripts + ", total=" + result.total_scripts);
    console.log("Stylesheets:", result.total_stylesheets);
    if (sectionStoreCount > 0) {
      console.log("Section Store sections:", sectionStoreCount);
    }
    console.log("────────────────────────────────────────");
    if (result.detected_script_srcs.length > 0) {
      console.log("All detected script src URLs (" + result.detected_script_srcs.length + " unique):");
      console.log(result.detected_script_srcs);
    }
    if (Object.keys(appsObject).length > 0) {
      console.log("Apps (name → metadata + script srcs):");
      console.log(appsObject);
    } else {
      console.log("No apps detected.");
    }
    console.log("%c (Full result available as window.__shopifyApps)", "color: #888; font-size: 11px;");
    window.__shopifyApps = result;
    return result;
  })().catch((err) => {
    console.error("Shopify App Detector failed:", err);
    throw err;
  });