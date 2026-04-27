(async () => {
    const APPS_JSON_URL = "https://pandatests.myshopify.com/cdn/shop/t/70/assets/apps.json?v=126819430410946608741777188403";
  
    // ── Helpers ──────────────────────────────────────────────────────
    const fetchJSON = async (url) => {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid catalog format");
      return data;
    };
  
    const getAppName = (app) => app.appTitle || app.name || (app.id != null ? `App #${app.id}` : "Unknown App");
    
    const getAppCategory = (app) => {
      if (app.category?.trim()) return app.category;
      try {
        const cats = JSON.parse(app.categoriesJson || "[]");
        if (Array.isArray(cats) && cats[0]?.trim()) return cats[0];
      } catch {}
      return "Uncategorized";
    };
  
    const getAppKey = (app) => app.id?.toString() || getAppName(app);
    
    const matchesPattern = (text, patterns) => 
      patterns?.some(p => text?.toLowerCase().includes(String(p).toLowerCase()));
  
    // ── Detection Logic ──────────────────────────────────────────────
    const detectByPatterns = (catalog, elements, attr) => {
      const results = new Map();
      const texts = elements.map(el => el[attr]).filter(Boolean);
      
      for (const app of catalog) {
        const matches = texts.filter(src => matchesPattern(src, app.patterns));
        if (matches.length) results.set(getAppKey(app), { app, matches });
      }
      return results;
    };
  
    const detectByDOM = (app) => 
      (app.domSelectors || [])
        .map(sel => {
          try { return document.querySelectorAll(sel).length; } catch { return 0; }
        })
        .filter(count => count > 0)
        .map((count, i) => `(DOM: ${count} x ${app.domSelectors[i]})`);
  
    // ── Main Execution ───────────────────────────────────────────────
    const catalog = await fetchJSON(APPS_JSON_URL);
    const scripts = [...document.querySelectorAll("script")];
    const links = [...document.querySelectorAll("link[href]")];
  
    // Detect apps via script/link patterns
    const detected = new Map();
    
    const addDetection = (app, sources) => {
      const key = getAppKey(app);
      if (!detected.has(key)) {
        detected.set(key, {
          ...app,
          name: getAppName(app),
          category: getAppCategory(app),
          sourceAppUrl: app.sourceAppUrl || null,
          appIconUrl: app.appIconUrl || null,
          scripts: []
        });
      }
      const entry = detected.get(key);
      sources.forEach(src => {
        if (src && !entry.scripts.includes(src)) entry.scripts.push(src);
      });
    };
  
    // Pattern-based detection
    for (const app of catalog) {
      const srcs = [
        ...new Set([
          ...scripts.map(s => s.src).filter(src => matchesPattern(src, app.patterns)),
          ...links.map(l => l.href || l.getAttribute("href")).filter(href => matchesPattern(href, app.patterns))
        ])
      ];
      const domHits = detectByDOM(app);
      if (srcs.length || domHits.length) addDetection(app, [...srcs, ...domHits]);
    }
  
    // Detect unknown Shopify scripts, then re-match against catalog
    const shopifyScripts = scripts
      .map(s => s.src)
      .filter(src => 
        src && 
        !src.includes("shopify.com") || 
        (src.includes("extensions") || src.includes("proxy") || src.includes("apps") || src.includes("?shop="))
      );
  
    shopifyScripts.forEach(src => {
      const match = catalog.find(app => matchesPattern(src, app.patterns));
      if (match) addDetection(match, [src]);
    });
  
    // Sections Store detection
    const sectionCount = document.querySelectorAll("[id*='shopify-section'] > [class*='_ss_'][class*='section-template']").length;
    if (sectionCount) {
      addDetection({ id: "sections-store-dom", appTitle: "Sections Store", category: "Page Builders" }, 
        [`(DOM: ${sectionCount} section-template elements)`]);
    }
  
    // ── Results Assembly ─────────────────────────────────────────────
    const allScriptSrcs = new Set(
      [...detected.values()].flatMap(app => app.scripts.filter(s => s?.startsWith("http")))
    );
  
    const result = {
      url: location.href,
      source_apps_url: APPS_JSON_URL,
      catalog_total: catalog.length,
      detected_apps: [...detected.values()],
      apps: Object.fromEntries([...detected.entries()].map(([k, v]) => [v.name, v])),
      total_detected: detected.size,
      total_head_scripts: document.head?.querySelectorAll("script").length || 0,
      total_body_scripts: document.body?.querySelectorAll("script").length || 0,
      total_stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
      section_store_count: sectionCount,
      detected_script_srcs: [...allScriptSrcs]
    };
  
    // ── Output ───────────────────────────────────────────────────────
    console.log("%c Shopify App Detector — Results", "font-size:16px;font-weight:bold;color:#96bf48");
    console.log("────────────────────────────────────────");
    console.log(`URL: ${result.url}`);
    console.log(`Catalog apps: ${result.catalog_total}`);
    console.log(`Apps detected: ${result.total_detected}`);
    console.log(`Scripts: head=${result.total_head_scripts}, body=${result.total_body_scripts}`);
    if (sectionCount) console.log(`Section Store sections: ${sectionCount}`);
    console.log("────────────────────────────────────────");
    
    if (result.detected_script_srcs.length) {
      console.log(`Detected script URLs (${result.detected_script_srcs.length} unique):`, result.detected_script_srcs);
    }
    if (Object.keys(result.apps).length) {
      console.log("Apps detected:", result.apps);
    } else {
      console.log("No apps detected.");
    }
    console.log("%c (Full result: window.__shopifyApps)", "color:#888;font-size:11px");
    
    window.__shopifyApps = result;
    return result;
  
  })().catch(err => {
    console.error("Shopify App Detector failed:", err);
    throw err;
  });