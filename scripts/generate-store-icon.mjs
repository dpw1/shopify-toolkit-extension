/**
 * Resizes repo-root new-logo.png into Chrome extension icon PNGs under public/icons/.
 * Uses fit: 'contain' on a square canvas so the full logo stays visible; pads with white
 * to match the source artwork’s card background.
 */

import { mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'new-logo.png')
const OUT_DIR = join(ROOT, 'public', 'icons')

const SIZES = [16, 32, 48, 128]
const PAD = { r: 255, g: 255, b: 255, alpha: 1 }

async function main() {
  if (!existsSync(SRC)) {
    console.error(`Missing source file: ${SRC}`)
    process.exit(1)
  }

  mkdirSync(OUT_DIR, { recursive: true })

  for (const size of SIZES) {
    const outPath = join(OUT_DIR, `icon${size}.png`)
    await sharp(SRC)
      .resize(size, size, {
        fit: 'contain',
        position: 'centre',
        background: PAD,
      })
      .png({ compressionLevel: 9, effort: 10 })
      .toFile(outPath)
    console.log(`  wrote ${outPath}`)
  }

  // Explicit Chrome Web Store listing asset name (same 128px asset)
  const storePath = join(OUT_DIR, 'store-icon-128.png')
  await sharp(SRC)
    .resize(128, 128, { fit: 'contain', position: 'centre', background: PAD })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(storePath)
  console.log(`  wrote ${storePath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
