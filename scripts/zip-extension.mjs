/**
 * Zips the dist/ folder into dist-zip/shopify-spykit-<version>.zip
 * Uses only Node.js built-ins (no archiver dependency needed).
 *
 * NOTE: For Web Store submission, make sure the `key` field is
 * OMITTED from manifest.config.ts before running `npm run zip`.
 */

import { createWriteStream, mkdirSync, readdirSync, statSync, readFileSync } from 'fs'
import { join, relative } from 'path'
import { execSync } from 'child_process'

const version = JSON.parse(readFileSync('package.json', 'utf-8')).version
const outDir = 'dist-zip'
const outFile = join(outDir, `shopify-spykit-${version}.zip`)

mkdirSync(outDir, { recursive: true })

// Use PowerShell's Compress-Archive (Windows) or zip (Unix)
if (process.platform === 'win32') {
  execSync(`powershell -Command "Compress-Archive -Force -Path 'dist/*' -DestinationPath '${outFile}'"`)
} else {
  execSync(`cd dist && zip -r "../${outFile}" .`)
}

console.log(`\nCreated ${outFile}`)
