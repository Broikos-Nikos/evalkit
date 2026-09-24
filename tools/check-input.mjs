/**
 * The committed evaluation is the one the figures were computed from.
 *
 *   npm run check:input
 *
 * This project's whole argument is a quotation of a sibling repository by
 * number. `data/meta.json` is that quotation, and without a hash it could be
 * edited by hand and the figures rebuilt from the edit, leaving every number
 * internally consistent and about a document nobody else has.
 *
 * Deliberately not checked: whether `data/meta.json` still matches the live file
 * in `../watch-it-think`. It does today, and the day that project records its
 * discordant counts it will not, and that is a change to answer rather than to
 * fail on.
 */

import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const frozen = resolve(root, 'data/meta.json')
const generated = resolve(root, 'src/generated/evaluation.json')

let failed = 0
const fail = (what, detail) => {
  failed++
  console.error(`FAIL  ${what}`)
  if (detail) console.error(`      ${detail}`)
}

for (const [p, name] of [
  [frozen, 'data/meta.json'],
  [generated, 'src/generated/evaluation.json'],
]) {
  if (!existsSync(p)) {
    console.error(`FAIL  ${name} is missing. Run npm run build:input`)
    process.exit(1)
  }
}

const ev = JSON.parse(readFileSync(generated, 'utf8'))
const bytes = readFileSync(frozen)
const sha256 = createHash('sha256').update(bytes).digest('hex')

if (!ev.source?.sha256) {
  fail('src/generated/evaluation.json records no sha256 for its input', 'Run npm run build:input')
} else if (ev.source.sha256 !== sha256) {
  fail(
    'data/meta.json is not the file these figures were computed from',
    `recorded ${ev.source.sha256.slice(0, 16)}..., on disk ${sha256.slice(0, 16)}...` +
      String.fromCharCode(10) +
      `      Recorded ${ev.source.bytes} bytes, on disk ${bytes.length}.`,
  )
} else {
  console.log(
    `  ok      data/meta.json is the ${(bytes.length / 1024).toFixed(0)} KB frozen on ${ev.built}, sha256 ${sha256.slice(0, 16)}...`,
  )
}

/*
 * The claim the whole project rests on: that the paired test cannot be run,
 * because the counts it needs were never recorded. If the input ever answers
 * that, the argument has been met, and this says so rather than letting the
 * project keep quoting a file that no longer supports it.
 */
const text = bytes.toString('utf8').toLowerCase()
const answered = text.includes('discordant') || text.includes('mcnemar')
if (answered !== (ev.source.discordantCountsRecorded || ev.source.pairedTestRecorded)) {
  fail('the committed record of what the input contains disagrees with the input', 'Run npm run build:input')
} else if (answered) {
  fail(
    'the input now records a paired test or its discordant counts',
    'The comparison can be judged after all. Re-examine the argument rather than keep making it.',
  )
} else {
  console.log('  ok      the input still records neither a paired test nor the counts one needs')
}

if (failed > 0) {
  console.error('\nA quotation of a file that has changed is a claim about a document nobody else has.')
  process.exit(1)
}

console.log('input: the evaluation is committed, hashed, and is the one measured')
