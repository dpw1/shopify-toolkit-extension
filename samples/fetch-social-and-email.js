function fetchStoreContacts() {

    const socialRules = {
      instagram: {
        pattern:   /instagram\.com\//,
        blacklist: ['/p/', '/reel/', '/explore/', '/stories/'],
      },
      facebook: {
        pattern:   /facebook\.com\//,
        blacklist: ['/sharer', '/share', '/dialog/', '/watch/', '/groups/'],
      },
      twitter: {
        pattern:   /twitter\.com\//,
        blacklist: ['/share', '/intent/', '/hashtag/'],
      },
      x: {
        pattern:   /x\.com\//,
        blacklist: ['/share', '/intent/', '/i/'],
      },
      tiktok: {
        pattern:   /tiktok\.com\/@/,
        blacklist: [],
      },
      youtube: {
        pattern:   /youtube\.com\/(channel\/|c\/|@|user\/)/,
        blacklist: ['/watch', '/shorts/', '/playlist', '/embed/'],
      },
      pinterest: {
        pattern:   /pinterest\.com\//,
        blacklist: ['/pin/', '/search/', '/explore/'],
      },
      linkedin: {
        pattern:   /linkedin\.com\/(company|in)\//,
        blacklist: ['/sharing/', '/share'],
      },
      snapchat: {
        pattern:   /snapchat\.com\/add\//,
        blacklist: [],
      },
      vimeo: {
        pattern:   /vimeo\.com\/(channels\/|groups\/|[a-zA-Z][a-zA-Z0-9]+$)/,
        blacklist: ['/video/', '/ondemand/', '/showcase/'],
      },
    };
  
    const emailBlacklist = [
      'sentry.io', 'example.com', 'yourdomain', 'domain.com',
      'shopify.com', 'cdn.shopify', 'wixpress.com', 'test.com',
    ];
  
    const emailPattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const social = {};
    const emailsFound = new Set();
  
    // ── Socials — anchors only ───────────────────────────
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      for (const [platform, rules] of Object.entries(socialRules)) {
        if (social[platform]) continue;
        if (!rules.pattern.test(href)) continue;
        if (rules.blacklist.some(b => href.includes(b))) continue;
        social[platform] = href;
      }
    });
  
    // ── Emails — mailto anchors ──────────────────────────
    document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
      const email = a.getAttribute('href')
        .replace('mailto:', '')
        .split('?')[0]
        .trim()
        .toLowerCase();
      if (email && !emailBlacklist.some(ex => email.includes(ex))) {
        emailsFound.add(email);
      }
    });
  
    // ── Emails — visible text only ───────────────────────
    const bodyText = document.body.innerText || '';
    (bodyText.match(emailPattern) || []).forEach(e => {
      if (!emailBlacklist.some(ex => e.includes(ex))) {
        emailsFound.add(e.toLowerCase());
      }
    });
  
    return {
      social,
      emails: [...emailsFound],
    };
  }