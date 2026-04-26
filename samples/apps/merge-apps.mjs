/**
 * Merges from-scraper.js (JSON) + from-extension.js (export const appsDatabase) -> apps-list.json
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const scraperPath = join(__dirname, 'from-scraper.js')
const extensionPath = join(__dirname, 'from-extension.js')
const outPath = join(__dirname, 'apps-list.json')

function loadExtension() {
  const s = readFileSync(extensionPath, 'utf8')
  const i = s.indexOf('export const appsDatabase = ')
  if (i < 0) throw new Error('from-extension: appsDatabase not found')
  const j = s.indexOf('[', i)
  const k = s.lastIndexOf('];')
  if (j < 0 || k < 0) throw new Error('from-extension: array not found')
  const arrayStr = s.slice(j, k + 1)
  // eslint-disable-next-line no-new-func
  return new Function('return ' + arrayStr)()
}

function toDomSelectors(v) {
  if (v == null) return []
  if (Array.isArray(v)) {
    return v.map(String).map((s) => s.trim()).filter(Boolean)
  }
  const s = String(v).trim()
  return s ? [s] : []
}

function patternsToDomSelectors(patterns) {
  if (!Array.isArray(patterns) || !patterns.length) return []
  return patterns.map((p) => {
    const esc = String(p).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    return `script[src*='${esc}']`
  })
}

/** Scraper row: pattern-derived + explicit domSelectors, deduped, order preserved. */
function scraperOnlyDomSelectors(sRow) {
  const fromPat = patternsToDomSelectors(sRow.patterns || [])
  const fromDom = Array.isArray(sRow.domSelectors)
    ? sRow.domSelectors.map((s) => String(s).trim()).filter(Boolean)
    : []
  const seen = new Set()
  const out = []
  for (const x of [...fromPat, ...fromDom]) {
    if (seen.has(x)) continue
    seen.add(x)
    out.push(x)
  }
  return out
}

function loadScraper() {
  return JSON.parse(readFileSync(scraperPath, 'utf8'))
}

function keyName(name) {
  return String(name).trim()
}

// ---

const scraper = loadScraper()
const extension = loadExtension()

const scraperByName = new Map()
for (const row of scraper) {
  const k = keyName(row.name)
  if (scraperByName.has(k)) {
    // Merge scraper rows with same name: union patterns & domSelectors, first category wins
    const cur = scraperByName.get(k)
    const p = new Set([...(cur.patterns || []), ...(row.patterns || [])])
    cur.patterns = [...p]
    const d1 = Array.isArray(cur.domSelectors) ? cur.domSelectors : []
    const d2 = Array.isArray(row.domSelectors) ? row.domSelectors : []
    if (d1.length || d2.length) {
      const seen = new Set()
      const out = []
      for (const x of [...d1, ...d2]) {
        const s = String(x)
        if (seen.has(s)) continue
        seen.add(s)
        out.push(s)
      }
      cur.domSelectors = out
    }
  } else {
    scraperByName.set(k, {
      ...row,
      name: row.name,
      patterns: [...(row.patterns || [])],
      domSelectors: Array.isArray(row.domSelectors) ? [...row.domSelectors] : undefined,
    })
  }
}

// Collapse extension by name: merge domSelectors
const extByName = new Map()
for (const row of extension) {
  const k = keyName(row.name)
  const sel = toDomSelectors(row.selector)
  if (extByName.has(k)) {
    const cur = extByName.get(k)
    const set = new Set([...cur._dom, ...sel])
    cur._dom = [...set]
    // prefer non-empty for text fields: keep first if second empty
    for (const f of ['description', 'download', 'picture', 'author']) {
      if (!cur[f] && row[f]) cur[f] = row[f]
    }
  } else {
    extByName.set(k, { ...row, _dom: sel })
  }
}

const merged = new Map()
const allNames = new Set([...scraperByName.keys(), ...extByName.keys()])

for (const n of allNames) {
  const sRow = scraperByName.get(n)
  const eRow = extByName.get(n)

  if (sRow && eRow) {
    const dom = eRow._dom?.length ? eRow._dom : toDomSelectors(eRow.selector)
    merged.set(n, {
      name: sRow.name,
      category: sRow.category,
      description: eRow.description ?? null,
      download: eRow.download ?? null,
      picture: eRow.picture ?? null,
      author: eRow.author ?? null,
      domSelectors: dom,
    })
  } else if (eRow) {
    const dom = eRow._dom?.length ? eRow._dom : toDomSelectors(eRow.selector)
    merged.set(n, {
      name: eRow.name,
      category: null,
      description: eRow.description ?? null,
      download: eRow.download ?? null,
      picture: eRow.picture ?? null,
      author: eRow.author ?? null,
      domSelectors: dom,
    })
  } else if (sRow) {
    merged.set(n, {
      name: sRow.name,
      category: sRow.category,
      description: null,
      download: null,
      picture: null,
      author: null,
      domSelectors: scraperOnlyDomSelectors(sRow),
    })
  }
}

// Exact key order in output: name, description, download, picture, author, category, domSelectors
const out = []
for (const n of merged.keys()) {
  const o = merged.get(n)
  out.push({
    name: o.name,
    description: o.description,
    download: o.download,
    picture: o.picture,
    author: o.author,
    category: o.category,
    domSelectors: o.domSelectors,
  })
}
out.sort((a, b) => a.name.localeCompare(b.name, 'en'))

// Validate
const required = [
  'name',
  'description',
  'download',
  'picture',
  'author',
  'category',
  'domSelectors',
]
for (let i = 0; i < out.length; i++) {
  const o = out[i]
  for (const k of required) {
    if (!Object.prototype.hasOwnProperty.call(o, k)) {
      throw new Error(`Item ${i} missing key ${k}`)
    }
  }
  if (!Array.isArray(o.domSelectors)) {
    throw new Error(`Item ${i} domSelectors not array: ${o.name}`)
  }
}

writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log(
  `Wrote ${out.length} items to ${outPath} (scraper: ${scraper.length}, extension: ${extension.length})`
)
