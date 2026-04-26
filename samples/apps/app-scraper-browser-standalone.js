;(async () => {
  const toText = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim()
  const toAbs = (url) => {
    if (!url) return null
    try {
      return new URL(url, window.location.origin).toString()
    } catch (_e) {
      return null
    }
  }
  const stripUrlQueryAndHash = (url) => {
    if (!url) return null
    try {
      const u = new URL(url, window.location.origin)
      u.search = ''
      u.hash = ''
      return u.toString()
    } catch (_e) {
      return url
    }
  }
  const parseIntSafe = (value) => {
    const n = Number(String(value || '').replace(/[^\d]/g, ''))
    return Number.isFinite(n) ? n : 0
  }
  const parseFloatSafe = (value) => {
    if (value == null) return null
    const s = String(value).replace(/[^\d.]/g, '')
    if (s === '') return null
    const n = Number(s)
    return Number.isFinite(n) ? n : null
  }

  /** One-decimal rating to avoid float noise (e.g. 5.05, 0.05). */
  function roundRatingOneDecimal(n) {
    if (n == null || !Number.isFinite(n)) return null
    return Math.round(n * 10) / 10
  }

  /** Strip trailing toggle copy from truncated blocks. */
  function stripTruncationToggles(text) {
    if (!text) return null
    return (
      text
        .replace(/\s*show\s+more\s*$/i, '')
        .replace(/\s*show\s+less\s*$/i, '')
        .trim() || null
    )
  }

  /** Developer "Launched" line sometimes includes "· Changelog". */
  function cleanLaunchDate(text) {
    if (!text) return null
    return text.replace(/\s*·\s*Changelog.*$/i, '').trim() || null
  }

  function getJsonLd(doc) {
    for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
      const raw = (s.textContent || '').trim()
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const found = parsed.find((x) => x && x['@type'] === 'SoftwareApplication')
          if (found) return found
        } else if (parsed && parsed['@type'] === 'SoftwareApplication') {
          return parsed
        }
      } catch (_e) {}
    }
    return null
  }

  function parsePricing(doc) {
    // Each plan lives in a .tw-snap-center wrapper; the trial <p> is a sibling of .app-details-pricing-plan-card
    const wrappers = doc.querySelectorAll('#adp-pricing .tw-snap-center')
    const plans = []
    for (const wrapper of wrappers) {
      const card = wrapper.querySelector('.app-details-pricing-plan-card')
      if (!card) continue
      // Plan name is a <p data-test-id="name">, not an h2
      const name = toText(card.querySelector('[data-test-id="name"]'))
      const priceEl = card.querySelector('[data-pricing-component-target="cardHeadingPrice"] h3')
      const priceLabel = priceEl?.getAttribute('aria-label') || toText(priceEl)
      const description = toText(card.querySelector('[data-pricing-component-target="description"]')) || null
      const features = Array.from(card.querySelectorAll('li')).map(toText).filter(Boolean)
      // Trial text is a sibling <p> outside .app-details-pricing-plan-card
      const trialEl = Array.from(wrapper.children).find(
        (el) => el !== card && /trial/i.test(toText(el))
      )
      const trialInfo = toText(trialEl) || null

      plans.push({
        name: name || null,
        price: priceLabel || null,
        description,
        trialInfo,
        features,
      })
    }
    return {
      plans,
      seeAllPricingUrl: toAbs(doc.querySelector('#adp-pricing a[href*="pricing"]')?.getAttribute('href')),
    }
  }

  function parseReviewBreakdown(doc) {
    const out = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const links = doc.querySelectorAll('#adp-reviews a[href*="/reviews?ratings%5B%5D="]')
    for (const a of links) {
      const href = a.getAttribute('href') || ''
      const m = href.match(/ratings%5B%5D=(\d)/)
      if (!m) continue
      out[m[1]] = parseIntSafe(a.getAttribute('aria-label') || toText(a))
    }
    return out
  }

  function parseVisibleReviews(doc) {
    const list = []
    const reviews = doc.querySelectorAll('[data-merchant-review]')
    for (const r of reviews) {
      const parent = r.closest('[id^="review-"]') || r

      const title = toText(r.querySelector('h3, h4, [data-truncate-review-title]')) || null

      // Review body: strip the hidden "Show more" toggle button text
      const bodyEl = r.querySelector('[data-truncate-review]')
      const bodyText = stripTruncationToggles(
        toText(bodyEl?.querySelector('[data-truncate-content-copy]') ?? bodyEl)
      )

      const starsAria = r.querySelector('[aria-label*="out of 5 stars"]')?.getAttribute('aria-label') || null

      // Date is in its own .tw-text-body-xs.tw-text-fg-tertiary div in the review header row
      const dateEl = r.querySelector('.tw-order-2 .tw-text-body-xs.tw-text-fg-tertiary, .tw-text-body-xs.tw-text-fg-tertiary')
      const dateText = toText(dateEl) || null

      // Metadata sidebar (.tw-order-1): merchant name, country, years using the app
      const metaSidebar = r.querySelector('.tw-order-1')
      const merchantName = toText(metaSidebar?.querySelector('.tw-text-heading-xs, [data-merchant-review-author]')) || null

      // yearsUsing lives in one of the plain <div>s inside the sidebar
      const sidebarDivs = Array.from(metaSidebar?.querySelectorAll('div') ?? []).map(toText).filter(Boolean)
      const yearsUsing =
        sidebarDivs.find((x) => /using\s+the\s+app/i.test(x) && x.length < 60) || null

      const shareBtn = parent.querySelector('[data-review-share-link]')
      const reviewUrl = toAbs(shareBtn?.getAttribute('data-review-share-link'))

      const replyContainer = parent.querySelector('[data-merchant-review-reply]')
      const replyTrunc = replyContainer?.querySelector('[data-truncate-review]')
      const replyText = stripTruncationToggles(
        toText(
          replyTrunc?.querySelector('[data-truncate-content-copy]') ?? replyTrunc ?? replyContainer
        )
      )

      list.push({
        reviewId: r.getAttribute('data-review-content-id') || null,
        title,
        body: bodyText,
        starsLabel: starsAria,
        merchantName,
        yearsUsing,
        date: dateText,
        reviewUrl,
        reply: replyText,
      })
    }
    return list
  }

  function parseMoreAppsLikeThis(doc) {
    const cards = doc.querySelectorAll('#adp-similar-apps [data-app-card-name-value]')
    return Array.from(cards).map((card) => {
      const name = card.getAttribute('data-app-card-name-value') || null
      const handle = card.getAttribute('data-app-card-handle-value') || null
      const iconUrl = toAbs(card.getAttribute('data-app-card-icon-url-value'))
      const appLink = toAbs(card.getAttribute('data-app-card-app-link-value'))
      const anchor = card.querySelector('a[href]')
      const href = toAbs(anchor?.getAttribute('href'))

      const ratingNumber =
        parseFloatSafe(
          toText(
            Array.from(card.querySelectorAll('span')).find((s) => /out of 5 stars/i.test(toText(s.nextElementSibling)))
          )
        ) || parseFloatSafe(toText(card.querySelector('.tw-text-body-xs span')))

      const reviewsCountSr = Array.from(card.querySelectorAll('.tw-sr-only'))
        .map(toText)
        .find((x) => /total reviews/i.test(x))
      const reviewCount = parseIntSafe(reviewsCountSr || toText(card.querySelector('[aria-hidden="true"]')))
      const pricingBlurb = Array.from(card.querySelectorAll('span')).map(toText).find((x) => /plan|free|trial|\$|month/i.test(x)) || null
      const shortDescription = toText(card.querySelector('.tw-text-fg-secondary.tw-text-body-xs')) || null
      const builtForShopify = /built for shopify/i.test(toText(card))

      return {
        handle,
        name,
        iconUrl,
        appUrl: appLink || href,
        rating: ratingNumber,
        reviewCount,
        pricingBlurb,
        shortDescription,
        builtForShopify,
      }
    })
  }

  function parseCategoryFeatures(doc) {
    const wrappers = doc.querySelectorAll('[data-controller="accordion"] [data-accordion-target="wrapper"]')
    const out = []
    for (const w of wrappers) {
      const categoryAnchor = w.querySelector('a[href*="/categories/"]')
      const categoryName = toText(categoryAnchor) || null
      const categoryUrl = toAbs(categoryAnchor?.getAttribute('href'))
      const groups = Array.from(w.querySelectorAll('.tw-pb-lg')).map((g) => ({
        groupName: toText(g.querySelector('p')) || null,
        // use 'ul li' only — not 'ul li a, ul li' which would double-count each feature
        features: Array.from(g.querySelectorAll('ul li')).map(toText).filter(Boolean),
      }))
      out.push({
        categoryName,
        categoryUrl,
        featureGroups: groups,
      })
    }
    return out
  }

  function parseLanguagesAndIntegrations(doc) {
    // Languages + Works with sit in a tw-grid row *after* #app-details closes — not under #app-details
    const rows = doc.querySelectorAll('div.tw-grid.tw-grid-cols-4')
    const data = { languages: null, worksWith: [] }
    for (const row of rows) {
      const label = toText(row.querySelector('p'))
      if (/^languages$/i.test(label)) {
        const valueCell = row.querySelector('div.tw-col-span-full.sm\\:tw-col-span-3')
        data.languages = toText(valueCell?.querySelector('p')) || toText(valueCell) || null
      } else if (/^works with$/i.test(label)) {
        const ul = row.querySelector('ul.tw-col-span-full.sm\\:tw-col-span-3, ul')
        if (ul) {
          data.worksWith = Array.from(ul.querySelectorAll('li')).map(toText).filter(Boolean)
        }
      }
    }
    return data
  }

  function parseDeveloperInfo(doc) {
    const section = doc.querySelector('#adp-developer')
    if (!section) return null
    const developerLink = section.querySelector('a[href*="/partners/"]')
    const websiteLink = Array.from(section.querySelectorAll('a')).find((a) => /^website$/i.test(toText(a)))
    const launchedLabel = Array.from(section.querySelectorAll('p')).find((p) => /^launched$/i.test(toText(p)))
    const launchedDate = launchedLabel?.parentElement?.querySelectorAll('p')?.[1]
    const address = Array.from(section.querySelectorAll('p.tw-text-fg-tertiary')).map(toText).find(Boolean) || null

    return {
      partnerName: toText(developerLink) || null,
      partnerUrl: toAbs(developerLink?.getAttribute('href')),
      website: toAbs(websiteLink?.getAttribute('href')),
      address,
      launchDate: cleanLaunchDate(toText(launchedDate)),
      supportEmail: section.getAttribute('data-developer-support-email') || null,
    }
  }

  function parseCategories(doc) {
    // The categories accordion is outside #app-details; target it via its unique data attribute
    const set = new Set()
    const links = doc.querySelectorAll('[data-accordion-open-only-one-value="true"] a[href*="/categories/"]')
    for (const a of links) {
      const text = toText(a)
      if (text) set.add(text)
    }
    return Array.from(set)
  }

  function parseAppPage(html, appURL) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const jsonLd = getJsonLd(doc)

    const appImages = Array.from(new Set([
      ...Array.from(doc.querySelectorAll('.lightbox-carousel-item img, [data-controller="lightbox"] img'))
        .map((img) => img.getAttribute('src') || img.getAttribute('srcset')?.split(',')[0]?.trim().split(' ')[0])
        .filter(Boolean),
    ])).map(toAbs).filter(Boolean)

    const iconFromHero = toAbs(doc.querySelector('#adp-hero img')?.getAttribute('src'))
    const iconFromMeta = toAbs(doc.querySelector('meta[property="og:image"]')?.getAttribute('content'))
    const iconFromJsonLd = Array.isArray(jsonLd?.image) ? toAbs(jsonLd.image[0]) : toAbs(jsonLd?.image)
    const appIconUrl = iconFromHero || iconFromJsonLd || iconFromMeta || null

    const title =
      jsonLd?.name ||
      toText(doc.querySelector('h1')) ||
      doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      null

    const description =
      jsonLd?.description ||
      doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
      doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      null

    const demoAnchor = Array.from(doc.querySelectorAll('a')).find((a) => /view demo store/i.test(toText(a)))
    const viewDemoStoreUrl = stripUrlQueryAndHash(toAbs(demoAnchor?.getAttribute('href')))

    // #view-all-reviews-button points to the unfiltered reviews page; avoid star-filtered links
    const reviewsLink = doc.querySelector('#view-all-reviews-button')
    const reviewUrl = toAbs(reviewsLink?.getAttribute('href'))
    const totalReviews =
      parseIntSafe(doc.querySelector('#reviews-link')?.getAttribute('aria-label')) ||
      parseIntSafe(jsonLd?.aggregateRating?.ratingCount)
    const ratingFromDom = parseFloatSafe(
      doc.querySelector('#adp-reviews [aria-label*="out of 5 stars"]')?.getAttribute('aria-label')
    )
    const ratingFromJson = parseFloatSafe(jsonLd?.aggregateRating?.ratingValue)
    const overallRating = roundRatingOneDecimal(
      ratingFromDom != null ? ratingFromDom : ratingFromJson
    )

    // Strip any "Show more" toggle button text that lives inside the summary container
    const summaryEl = doc.querySelector('[data-truncate-app-review-summary]')
    const usersThinkSummary = stripTruncationToggles(
      toText(summaryEl?.querySelector('[data-truncate-content-copy]') ?? summaryEl)
    )
    const usersThinkMeta = toText(doc.querySelector('#adp-reviews [data-waypoint-surface-detail="reviews-summary"]')) || ''
    const usersThinkIsAiGenerated =
      /generated by shopify magic/i.test(toText(doc.querySelector('#adp-reviews'))) ||
      /shopify magic/i.test(usersThinkMeta)

    const details = parseLanguagesAndIntegrations(doc)

    return {
      sourceAppUrl: appURL,
      appIconUrl,
      appImages,
      appTitle: title,
      appDescription: description,
      viewDemoStoreUrl,
      pricing: parsePricing(doc),
      reviews: {
        overallRating,
        total: totalReviews,
        byStars: parseReviewBreakdown(doc),
      },
      usersThinkSummary,
      usersThinkIsAiGenerated,
      reviewUrl,
      visibleReviews: parseVisibleReviews(doc),
      domSelectors: [],
      moreAppsLikeThis: parseMoreAppsLikeThis(doc),
      categories: parseCategories(doc),
      categoryFeatures: parseCategoryFeatures(doc),
      worksWithIntegrations: details.worksWith,
      languagesSupported: details.languages,
      developer: parseDeveloperInfo(doc),
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async function fetchWith429Retry(url, contextLabel, options = {}) {
    const maxRetries = options.maxRetries ?? 3
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(url)
      if (response.status !== 429) {
        if (attempt > 0) {
          console.log(
            `[${contextLabel}] succeeded after retry ${attempt}/${maxRetries} (status ${response.status})`
          )
        }
        return response
      }

      if (attempt === maxRetries) {
        console.warn(
          `[${contextLabel}] received 429 on final attempt ${attempt + 1}/${maxRetries + 1}; giving up`
        )
        return response
      }

      console.warn(
        `[${contextLabel}] received 429 on attempt ${attempt + 1}/${maxRetries + 1}. Pausing 30000ms before retrying same URL...`
      )
      await sleep(30000)
      console.warn(`[${contextLabel}] retrying now...`)
    }

    // Unreachable, but keeps flow explicit.
    return fetch(url)
  }

  function listPageUrlFor(pageNumber) {
    const u = new URL(window.location.href)
    u.searchParams.set('page', String(pageNumber))
    return u.toString()
  }

  function extractAppUrlsFromListingHtml(html) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const cards = Array.from(doc.querySelectorAll('[data-app-card-name-value]'))
    const urls = cards
      .map((card) => {
        const href =
          card.querySelector('a')?.getAttribute('href') ||
          card.getAttribute('data-app-card-app-link-value')
        return toAbs(href)
      })
      .filter(Boolean)
    return { cardsCount: cards.length, urls }
  }

  window.appsResult = []

  const appUrlSeen = new Set()
  let page = 1
  let totalFetchedApps = 0

  while (true) {
    const listingUrl = listPageUrlFor(page)
    console.log(`\n=== Listing page ${page}: ${listingUrl} ===`)

    let listingHtml = ''
    try {
      const pageResp = await fetchWith429Retry(listingUrl, `listing page ${page}`)
      listingHtml = await pageResp.text()
      console.log(`Listing status: ${pageResp.status} ${pageResp.statusText}`)
    } catch (error) {
      console.error(`Failed to fetch listing page ${page}`, error)
      break
    }

    const { cardsCount, urls } = extractAppUrlsFromListingHtml(listingHtml)
    console.log(`Found ${cardsCount} app cards on page ${page} (${urls.length} URLs extracted)`)

    if (!cardsCount || !urls.length) {
      console.log(`No apps found on page ${page}. Pagination finished.`)
      break
    }

    let pageNewApps = 0
    let pageSkippedDuplicates = 0

    for (let i = 0; i < urls.length; i++) {
      const appURL = urls[i]
      const canonicalAppURL = stripUrlQueryAndHash(appURL)
      if (!canonicalAppURL) {
        console.warn(`[page ${page}] Invalid app URL at index ${i + 1}`, appURL)
        continue
      }

      if (appUrlSeen.has(canonicalAppURL)) {
        pageSkippedDuplicates += 1
        console.log(`[page ${page}] skip duplicate ${i + 1}/${urls.length}: ${canonicalAppURL}`)
        continue
      }
      appUrlSeen.add(canonicalAppURL)
      pageNewApps += 1
      totalFetchedApps += 1

      console.log(
        `\n[page ${page}] app ${i + 1}/${urls.length} | unique #${totalFetchedApps} | fetching: ${canonicalAppURL}`
      )
      try {
        const response = await fetchWith429Retry(
          canonicalAppURL,
          `app fetch page ${page} index ${i + 1}`
        )
        const html = await response.text()
        console.log(`Status: ${response.status} ${response.statusText}`)

        const parsed = parseAppPage(html, canonicalAppURL)
        window.appsResult.push(parsed)
        console.log(`Parsed "${parsed.appTitle || canonicalAppURL}"`)
      } catch (error) {
        console.error(`Failed to fetch ${canonicalAppURL}`, error)
        window.appsResult.push({
          sourceAppUrl: canonicalAppURL,
          error: String(error),
        })
      }

      // 1s delay between each app fetch
      await sleep(750)
    }

    console.log(
      `[page ${page}] complete | new: ${pageNewApps} | duplicates skipped: ${pageSkippedDuplicates} | total results: ${window.appsResult.length}`
    )

    page += 1
    // 3s delay between each listing page
    console.log(`Waiting 3000ms before page ${page}...`)
    await sleep(3000)
  }

  console.log(`Finished. Total unique apps in window.appsResult: ${window.appsResult.length}`)
  console.log('window.appsResult =>', window.appsResult)
})()
