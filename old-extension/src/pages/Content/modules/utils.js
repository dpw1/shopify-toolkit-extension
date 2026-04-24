const replaceAll = require('string.prototype.replaceall');
const striptags = require('striptags');

export function _extractTextBetween(text, start, end) {
  if (!start || !end) {
    throw new Error(`Please add a "start" and "end" parameter`);
  }

  if (!text) {
    throw new Error(`Please add the "text" parameter.`);
  }

  return text.split(start)[1].split(end)[0];
}

export function shortenString(str, maxLen = 100, separator = ' ') {
  if (str.length <= maxLen) return str;
  return str.substr(0, str.lastIndexOf(separator, maxLen));
}

export function cleanEzfyProducts(data, graphql = false) {
  const _data = graphql ? data.allWordpressProducts.edges[0].node : data;
  const ejunkie = _data.ejunkie.products;
  const gumroad = _data.gumroad.products;

  let products = [];

  ejunkie.map((e) => {
    const price = e.sub_items
      .map((el) => el.price)[0]
      .replace('$', '')
      .replace('.00', '');

    const _slug = e.name
      .replace(/[^\w\s]/gi, '')
      .toLowerCase()
      .split(' ')
      .join('-');

    const slug = replaceAll(_slug, '--', '-');

    if (slug === 'ezfy-service') {
      return null;
    }

    const tags = e.tags
      .map((e) => {
        if (!e) {
          return;
        }

        if (e.includes(';')) {
          return e;
        }

        return `${e.trim()};`;
      })
      .join('')
      .split(';')
      .filter((e) => e !== '')
      .map((e) => e.trim());

    return products.push({
      id: e.number,
      title: e.name,
      price,
      tags,
      miniDescription: e.description,
      description: e.details,
      thumbnail: e.images[0],
      slug,
      url: `https://ezfy.e-junkie.com/product/${e.number}`,
      addToCart: `https://www.fatfreecartpro.com/ecom/gb.php?&c=cart&ejc=2&cl=374804&i=${e.number}`,
    });
  });

  gumroad.map((e) => {
    if (!e.published) {
      return;
    }

    var _word = e.short_url.split('/');
    const _slug = _word[_word.length - 1];

    const slug = replaceAll(_slug, '--', '-');

    const miniDescription = `${shortenString(e.description)} (...)`;

    const getTags = () => {
      const query = `tags: `;
      const _tags = e.description.toLowerCase();

      if (_tags.includes(query)) {
        const _temp = striptags(_tags.split(query)[1]);

        return _temp.split(';').filter((e) => e !== `` && e !== `"`);
      }

      return [];
    };

    return products.push({
      id: e.wordpress_id,
      title: e.name,
      price: /0\+/.test(e.formatted_price)
        ? 'Free'
        : e.formatted_price.replace('$', ''),
      slug,
      tags: getTags(),
      miniDescription,
      description: e.description,
      thumbnail: e.preview_url,
      url: e.short_url,
    });
  });

  return products.filter((e) => e !== null).sort((a, b) => b.id - a.id);
}

export function cleanEcwidProducts(products) {
  return new Promise((resolve, reject) => {
    const filtered = products.items.filter((e) => {
      if (e.enabled) {
        return e;
      }
    });

    resolve(filtered);
  });
}

export async function getProductsFromCategory(category) {
  return new Promise(async (resolve, reject) => {
    const url = `https://app.ecwid.com/api/v3/61271341/categories?token=public_iNxZWDXrKMZrzGkdBWk3fvcfaJhBVgcm`;
    let response = await fetch(url);
    let data = await response.json();

    const _categories = data.items;

    let categories = _categories
      .filter((e) => {
        const name = e.name.toLowerCase();
        const theme = category.toLowerCase();

        if (
          name.includes(theme) ||
          name === 'all themes' ||
          name === 'app functionality'
        ) {
          // console.log(`${e.name} (${e.id})`);
          return e;
        }
      })
      .map((e) => e.id);

    const _products = await getProducts();

    /* If the product contains one of the allowed categories, 
    returns the product */
    const products = _products
      .map((e) => {
        const difference = compareArrays(e.categoryIds, categories);

        if (difference.length > 0) {
          return e;
        }
      })
      .filter((x) => x != null);

    resolve(shuffle(products));
  });
}

export function getProducts() {
  return new Promise(async (resolve, reject) => {
    const url = `https://app.ecwid.com/api/v3/61271341/products?token=public_iNxZWDXrKMZrzGkdBWk3fvcfaJhBVgcm`;
    let response = await fetch(url);
    let data = await response.json();

    const products = await cleanEcwidProducts(data);

    resolve(products);
  });
}

export function compareArrays(arr1, arr2) {
  return arr1.filter((x) => arr2.includes(x));
}

export function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

function _waitForElement(selector, delay = 50, tries = 100) {
  const element = document.querySelector(selector);

  if (!window[`__${selector}`]) {
    window[`__${selector}`] = 0;
    window[`__${selector}__delay`] = delay;
    window[`__${selector}__tries`] = tries;
  }

  function _search() {
    return new Promise((resolve) => {
      window[`__${selector}`]++;
      setTimeout(resolve, window[`__${selector}__delay`]);
    });
  }

  if (element === null) {
    if (window[`__${selector}`] >= window[`__${selector}__tries`]) {
      window[`__${selector}`] = 0;
      return Promise.resolve(null);
    }

    return _search().then(() => _waitForElement(selector));
  } else {
    return Promise.resolve(element);
  }
}

function extractTextBetween(text, start, end) {
  if (!start || !end) {
    throw new Error(`Please add a "start" and "end" parameter`);
  }

  return text.split(start)[1].split(end)[0];
}

export function getBoomrObject() {
  var $boomr =
    document.querySelector('script.boomerang') ||
    document.querySelector('script[class*="boomerang"]');
  if (!$boomr || typeof $boomr.textContent !== 'string') {
    return { theme: '', version: '' };
  }
  var raw = $boomr.textContent;
  try {
    var theme = extractTextBetween(
      raw,
      'window.BOOMR.themeName',
      '";'
    )
      .replaceAll(`= "`, '')
      .trim();

    var version = extractTextBetween(
      raw,
      'window.BOOMR.themeVersion',
      '";'
    )
      .replaceAll(`= "`, '')
      .trim();

    return { theme, version };
  } catch (e) {
    return { theme: '', version: '' };
  }
}
