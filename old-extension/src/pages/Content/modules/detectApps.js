/* Continue from...

https://apps.shopify.com/browse/store-design?app_installed=off&app_integration_pos=off&app_integration_shopify_checkout=off&page=7&pricing=all&requirements=off&sort_by=relevance

begin from

"essential free shipping bar"
*/

import { appsDatabase } from './apps';

function extractBetween([start, end]) {
  const matcher = new RegExp(`${start}(.*?)${end}`, 'gm');
  const normalise = (str) => str.slice(start.length, end.length * -1);
  return function (str) {
    return str.match(matcher).map(normalise);
  };
}

function _extractTextBetween(text, start, end) {
  if (!start || !end) {
    throw new Error(`Please add a "start" and "end" parameter`);
  }

  return text.split(start)[1].split(end)[0];
}

/* TODO 
  Find apps by HTML selector
  */
function getAppsInDOM() {
  let found = [];
  for (var each of appsDatabase) {
    const $el = document.querySelector(each.selector);

    if ($el) {
      found = [...found, each];
    }
  }

  return found;
}

function getScriptTags() {
  let $scripts = document.querySelectorAll(
    `head > script:not([src]):not([id]):not([type]):not([class]), 
    body > script:not([src]):not([id]):not([type]):not([class]),
    head > script[src]:not([src*='trekkie']):not([data-source-attribution]):not([src*='assets/global.js']):not([data-sections])`
  );

  let urls = [];

  for (var each of $scripts) {
    const url = each.getAttribute('src');

    if (!url) {
      continue;
    }

    urls = [...urls, url];
  }

  return urls;
}

function appsFoundByScriptTag() {
  let $scripts = document.querySelectorAll(
    `head > script:not([src]):not([id]):not([type]):not([class]), 
    body > script:not([src]):not([id]):not([type]):not([class]),
    head > script[src]:not([src*='trekkie']):not([data-source-attribution]):not([src*='assets/global.js']):not([data-sections])`
  );

  let apps = [];

  for (var each of $scripts) {
    var content = each.innerHTML;

    if (/urls\[i\]/gim.test(content) && /asyncload/gim.test(content)) {
      let _apps = _extractTextBetween(content, '[', ']');
      apps = [
        ...apps,
        ..._apps
          .split(',')
          .map((e) =>
            e
              .replaceAll(`\\`, '')
              .replaceAll(`\"`, '')
              .replaceAll(`//`, '')
              .replaceAll(`:`, `://`)
          ),
      ];
    } else {
      const url = each.getAttribute('src');

      if (!url) {
        continue;
      }

      if (
        /shopify_pay\/storefront/gim.test(url) ||
        /fbevents/gim.test(url) ||
        /shop_events_listener/gim.test(url) ||
        /assets\/vendor(s)?\.js/gim.test(url) ||
        /assets\/theme\.js/gim.test(url) ||
        /jquery/gim.test(url) ||
        /google-analytics/gim.test(url) ||
        /platform\.twitter/gim.test(url) ||
        /custom\.modernizr\.js/gim.test(url)
      ) {
        continue;
      }

      apps = [...apps, url];
    }
  }

  let _apps = apps.map(
    (e) => e.replace('https://', '').replace('//', '').split('?')[0]
  );

  const result = [...new Set(_apps)];

  return result;
}

function getAppsInScriptTags() {
  var list = appsFoundByScriptTag();

  if (list.length <= 0) {
    return [];
  }

  let all = [];

  for (var [i, each] of list.entries()) {
    var link = each.split('?')[0];

    all = [
      ...all,
      ...appsDatabase
        .filter((e) => /script/gim.test(e.selector))
        .map((e) => {
          const selectors = extractBetween([`'`, `'`])(e.selector);

          const found = selectors.filter((x) => {
            if (link.includes(x)) {
              return true;
            }

            return false;
          });

          /*
            Checks if the link contains all selectors. 

            For example, given the following URL:

            cdn.hextom.com/js/quickannouncementbar.js

            And the selector:

            script[src*='hextom'][src*='announcement']

            It's crucial that both "hextom" and "announcement" are present in the string.
            To ensure that is the case, we check if the selectors length is the same as found's.
            */

          if (found.length > 0 && found.length === selectors.length) {
            // console.log(found.length, link);
            return e;
          } else {
            return undefined;
          }
        })
        .filter((e) => e !== undefined),
    ];

    if (i >= list.length - 1) {
      return [...new Set(all)];
    }
  }
}

export function detectApps() {
  try {
    var scriptApps = getAppsInScriptTags();
    var DOMApps = getAppsInDOM();
    const scripts = getScriptTags();

    const _appsFound = [...scriptApps, ...DOMApps];
    const appsFound = [...new Set(_appsFound)];

    return {
      apps: appsFound,
      scripts,
    };
  } catch (err) {
    throw new Error(`Unable to get apps.`);
  }
}

export function getTotalApps() {
  return appsDatabase.length;
}
