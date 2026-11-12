import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../dist/', import.meta.url))
const limits = { total: 1024 * 1024, javascript: 420 * 1024 }

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(target))
    else files.push(target)
  }
  return files
}

const files = await walk(root)
let total = 0
let javascript = 0
for (const file of files) {
  const bytes = (await stat(file)).size
  total += bytes
  if (file.endsWith('.js')) javascript += bytes
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`
console.log(`Bundle: ${kb(total)} total, ${kb(javascript)} JavaScript`)

if (total > limits.total || javascript > limits.javascript) {
  console.error(`Budget exceeded (total ${kb(limits.total)}, JavaScript ${kb(limits.javascript)}).`)
  process.exit(1)
}
