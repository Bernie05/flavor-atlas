// json-server writes every create/update/delete straight into db.json.
// We keep the committed seed data in db.seed.json and copy it on first run,
// so local experiments never dirty git history. Pass --reset to start over.
import { copyFileSync, existsSync } from 'node:fs'

const reset = process.argv.includes('--reset')

if (reset || !existsSync('db.json')) {
  copyFileSync('db.seed.json', 'db.json')
  console.log(reset ? 'db.json reset from db.seed.json' : 'db.json created from db.seed.json')
}
