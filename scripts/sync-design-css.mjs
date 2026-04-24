import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const design = fs.readFileSync(join(root, 'design-for-popup.html'), 'utf8')
const m = design.match(/<style>([\s\S]*?)<\/style>/)
if (!m) throw new Error('No <style> in design-for-popup.html')

let css = m[1]
  .split(/\r?\n/)
  .map((line) => (line.startsWith('        ') ? line.slice(8) : line))
  .join('\n')

if (!/--radius-full\s*:/.test(css)) {
  if (!css.includes('    --radius-xl: 16px;')) {
    throw new Error('Expected --radius-xl: 16px; in :root')
  }
  css = css.replace('    --radius-xl: 16px;', '    --radius-xl: 16px;\n    --radius-full: 9999px;')
}

// After extracting from <style>, keep design body rules on #root (React mount).
css = css.replace(
  /body \{\s*\n[\s\S]*?\n\}/m,
  `body {
  margin: 0;
}
#root {
  font-family: var(--font-family);
  background-color: var(--bg-body);
  color: var(--text-main);
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}`,
)

css = css.replace(
  '.header-actions i {',
  '.header-actions i, .header-actions button {',
)
css = css.replace(
  '.header-actions i:hover {',
  '.header-actions i:hover, .header-actions button:hover {',
)
css = css.replace(
  '.tab i { width: 18px; height: 18px; }',
  '.tab i, .tab svg { width: 18px; height: 18px; }',
)
css = css.replace(
  '.app-category i { width: 16px; height: 16px; }',
  '.app-category i, .app-category svg { width: 16px; height: 16px; }',
)

css += `

/* Lucide: header uses <button> for a11y; design uses bare <i>. */
.header-actions button {
  background: none;
  border: none;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font: inherit;
  line-height: 0;
}
`

const out = `/* Auto-synced from design-for-popup.html <style>. */
/* #root: extension mount (design centers .app-container on <body>); --radius-full + SVG/button map. */

${css}
`

const dest = join(root, 'src', 'popup', 'styles', 'globals.css')
fs.writeFileSync(dest, out, 'utf8')
console.log('Wrote', dest)
