async function detectShopifyApps(htmlString) {
    const APPS_JSON_URL = "https://pandatests.myshopify.com/cdn/shop/t/70/assets/apps.json?v=126819430410946608741777188403";
  
    // 1️⃣ Parse HTML string into a DOM document
    const doc = new DOMParser().parseFromString(htmlString, "text/html");
    if (doc.querySelector("parsererror")) throw new Error("Invalid HTML string provided.");
  
    // 2️⃣ Helpers
    const fetchJSON = async (url) => {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch catalog: ${res.status} ${res.statusText}`);
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
  
    // 3️⃣ DOM Queries (parsed document only)
    const scripts = [...doc.querySelectorAll("script")];
    const links = [...doc.querySelectorAll("link[href]")];
  
    const detectByDOM = (app) =>
      (app.domSelectors || [])
        .map(sel => { try { return doc.querySelectorAll(sel).length; } catch { return 0; } })
        .filter(count => count > 0)
        .map((count, i) => `(DOM: ${count} x ${app.domSelectors[i]})`);
  
    const detected = new Map();
    const addDetection = (app, sources) => {
      const key = getAppKey(app);
      if (!detected.has(key)) {
        detected.set(key, {
          ...app, name: getAppName(app), category: getAppCategory(app),
          sourceAppUrl: app.sourceAppUrl || null, appIconUrl: app.appIconUrl || null, scripts: []
        });
      }
      const entry = detected.get(key);
      sources.forEach(src => { if (src && !entry.scripts.includes(src)) entry.scripts.push(src); });
    };
  
    // 4️⃣ Main Detection
    const catalog = await fetchJSON(APPS_JSON_URL);
  
    // Match catalog patterns against scripts & links
    for (const app of catalog) {
      const srcs = [...new Set([
        ...scripts.map(s => s.src || s.getAttribute("src")).filter(src => matchesPattern(src, app.patterns)),
        ...links.map(l => l.href || l.getAttribute("href")).filter(href => matchesPattern(href, app.patterns))
      ])];
      const domHits = detectByDOM(app);
      if (srcs.length || domHits.length) addDetection(app, [...srcs, ...domHits]);
    }
  
    // Re-match Shopify-specific scripts that weren't caught initially
    scripts.forEach(script => {
      const src = script.src || script.getAttribute("src");
      if (!src) return;
      const isShopify = src.includes("shopify.com") && (src.includes("extensions") || src.includes("proxy") || src.includes("apps"));
      const hasShop = src.includes(".js") && src.includes("?shop=");
      if (isShopify || hasShop) {
        const match = catalog.find(app => matchesPattern(src, app.patterns));
        if (match) addDetection(match, [src]);
      }
    });
  
    // Sections Store DOM detection
    const sectionCount = doc.querySelectorAll("[id*='shopify-section'] > [class*='_ss_'][class*='section-template']").length;
    if (sectionCount) {
      addDetection({ id: "sections-store-dom", appTitle: "Sections Store", category: "Page Builders" }, 
        [`(DOM: ${sectionCount} section-template elements)`]);
    }
  
    // 5️⃣ Results Assembly
    const allScriptSrcs = new Set([...detected.values()].flatMap(app => app.scripts.filter(s => s?.startsWith("http"))));
    const headScripts = doc.head?.querySelectorAll("script") || [];
    const bodyScripts = doc.body?.querySelectorAll("script") || [];
  
    const result = {
      url: null,
      source_apps_url: APPS_JSON_URL,
      catalog_total: catalog.length,
      detected_apps: [...detected.values()],
      apps: Object.fromEntries([...detected.entries()].map(([_, v]) => [v.name, v])),
      total_detected: detected.size,
      total_head_scripts: headScripts.length,
      total_body_scripts: bodyScripts.length,
      total_scripts: headScripts.length + bodyScripts.length,
      total_stylesheets: doc.querySelectorAll('link[rel="stylesheet"]').length,
      section_store_count: sectionCount,
      detected_script_srcs: [...allScriptSrcs]
    };
  
    // 6️⃣ Console Output (matches original style)
    console.log("%c Shopify App Detector — Results", "font-size:16px;font-weight:bold;color:#96bf48");
    console.log("────────────────────────────────────────");
    console.log(`Apps detected: ${result.total_detected}`);
    console.log(`Scripts: head=${result.total_head_scripts}, body=${result.total_body_scripts}`);
    if (sectionCount) console.log(`Section Store sections: ${sectionCount}`);
    console.log("────────────────────────────────────────");
    
    if (result.detected_script_srcs.length) console.log("Detected script URLs:", result.detected_script_srcs);
    if (Object.keys(result.apps).length) console.log("Apps:", result.apps);
    else console.log("No apps detected.");
  
    window.__shopifyApps = result;
    return result;
  }