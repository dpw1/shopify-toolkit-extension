/**
 * Generates PNG icons for the extension using pure Node.js (no extra deps).
 * Produces a filled circle on transparent background in the brand purple #7C5CFC.
 * Outputs to public/icons/ which Vite copies to the dist root verbatim.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { deflateSync } from 'zlib'

/** CRC-32 lookup table */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])))
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf])
}

/**
 * Creates a square PNG with a circle in RGBA colour (r,g,b,a).
 * @param {number} size - icon dimension in pixels
 * @param {number} r - red 0-255
 * @param {number} g - green 0-255
 * @param {number} b - blue 0-255
 */
function makePNG(size, r, g, b) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR: width, height, bit-depth=8, colour-type=6 (RGBA)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6

  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  const radius = size / 2 - 1.5

  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4)
    row[0] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      // Anti-aliased edge using smoothstep over 1px
      const alpha = dist <= radius - 0.5
        ? 255
        : dist >= radius + 0.5
          ? 0
          : Math.round((1 - (dist - (radius - 0.5))) * 255)
      row[1 + x * 4] = r
      row[2 + x * 4] = g
      row[3 + x * 4] = b
      row[4 + x * 4] = alpha
    }
    rows.push(row)
  }

  const raw = Buffer.concat(rows)
  const idat = deflateSync(raw, { level: 9 })

  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const OUT_DIR = 'public/icons'
mkdirSync(OUT_DIR, { recursive: true })

// Brand purple #7C5CFC = rgb(124, 92, 252)
const [R, G, B] = [124, 92, 252]

for (const size of [16, 32, 48, 128]) {
  const path = `${OUT_DIR}/icon${size}.png`
  if (existsSync(path)) {
    console.log(`  skip  ${path} (already exists)`)
    continue
  }
  writeFileSync(path, makePNG(size, R, G, B))
  console.log(`  wrote ${path}`)
}
