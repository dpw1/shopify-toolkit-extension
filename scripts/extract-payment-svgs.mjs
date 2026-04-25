import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const html = fs.readFileSync(path.join(root, 'samples', 'payment-icons.html'), 'utf8')
const parts = html.split(/<li class="list-payment__item"[^>]*>/i).slice(1)
const out = {}
for (const chunk of parts) {
  const idm = chunk.match(/aria-labelledby="(pi-[^"]+)"/)
  const start = chunk.indexOf('<svg')
  const end = chunk.lastIndexOf('</svg>')
  if (!idm) continue
  if (start === -1 || end === -1 || end < start) continue
  const key = idm[1].replace(/^pi-/, '')
  let s = chunk.slice(start, end + 6)
  s = s.replace(/\sclass="[^"]*"/g, '')
  s = s.replace(/stop-color=/g, 'stopColor=')
  s = s.replace(/fill-rule=/g, 'fillRule=')
  s = s.replace(/fill-opacity=/g, 'fillOpacity=')
  s = s.replace(/xml:space=/g, 'xmlSpace=')
  out[key] = s
}
const target = path.join(root, 'src', 'popup', 'generated', 'paymentSvgRaw.json')
fs.mkdirSync(path.dirname(target), { recursive: true })
fs.writeFileSync(target, JSON.stringify(out))
