// json-server writes every create/update/delete straight into db.json.
// We keep the committed seed data in db.seed.json and copy it on first run,
// so local experiments never dirty git history. Pass --reset to start over.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'

const reset = process.argv.includes('--reset')

if (reset || !existsSync('db.json')) {
  copyFileSync('db.seed.json', 'db.json')
  console.log(reset ? 'db.json reset from db.seed.json' : 'db.json created from db.seed.json')
} else {
  // A collection added to the seed later (the change history, say) is missing from an
  // older db.json, and json-server answers 404 for it. Add it (empty) and keep the rest.
  const seed = JSON.parse(readFileSync('db.seed.json', 'utf8'))
  const db = JSON.parse(readFileSync('db.json', 'utf8'))
  const missing = Object.keys(seed).filter((key) => !(key in db))
  if (missing.length > 0) {
    for (const key of missing) db[key] = Array.isArray(seed[key]) ? [] : seed[key]
    writeFileSync('db.json', `${JSON.stringify(db, null, 2)}\n`)
    console.log(`db.json: added ${missing.join(', ')}`)
  }
}
