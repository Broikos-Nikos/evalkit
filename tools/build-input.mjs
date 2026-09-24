/**
 * Freeze the evaluation this project is about, and compute what it can carry.
 *
 *   npm run build:input     # re-reads the sibling repository. Changes the numbers. Not run by the build.
 *   npm run check:power     # recomputes everything from the frozen copy. Run by every build.
 *
 * The input is `watch-it-think`'s published quantisation comparison, taken out
 * of its own `meta.json`. It lives in another repository, and this project's
 * entire argument is a quotation of it by number, so it is copied here and
 * hashed. A quotation of a file that has since changed is a claim about a
 * document nobody else has.
 *
 * `agentscope` learned the same thing one project ago from a development log
 * that grew every thirty minutes; `chunkline` learned it from Wikipedia
 * articles that were edited within a day of being measured. The lesson is the
 * same every time and it is cheap: commit the input, hash it, and the numbers
 * are reproducible from the clone forever.
 *
 * Choosing this evaluation rather than a public benchmark is deliberate. It is
 * the author's own work, published two days before this project was specified,
 * and a criticism of somebody else's evaluation with the same arithmetic would
 * be the same demonstration with less standing behind it.
 */

import { createHash } from 'node:crypto'
import { copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { halfWidth, minimumDetectable, nNeeded, nNeededPaired, mcnemarRange, judge } from './power-lib.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const UPSTREAM = resolve(root, '../watch-it-think/public/model/meta.json')
const FROZEN = resolve(root, 'data/meta.json')

mkdirSync(resolve(root, 'data'), { recursive: true })
mkdirSync(resolve(root, 'src/generated'), { recursive: true })

copyFileSync(UPSTREAM, FROZEN)
const bytes = readFileSync(FROZEN)
const sha256 = createHash('sha256').update(bytes).digest('hex')
const meta = JSON.parse(bytes.toString('utf8'))
const q = meta.quantisation
const n = q.heldOutSentences

/** The four figures the published table compares, in the order it prints them. */
export const METRICS = [
  ['intent accuracy', q.fp32.intentAccuracy, q.int8.intentAccuracy],
  ['tag accuracy', q.fp32.tagAccuracy, q.int8.tagAccuracy],
  ['exact match', q.fp32.exactMatch, q.int8.exactMatch],
  ['intent accuracy, allowed to decline', q.fp32.withAbstain.intentAccuracy, q.int8.withAbstain.intentAccuracy],
]

export function compute(metrics, n, meta) {
  const rows = metrics.map(([name, a, b]) => {
    const verdict = judge(a, b, n, { label: name })
    return {
      ...verdict,
      halfWidthPp: Number(halfWidth(a, n).toFixed(2)),
      nNeeded: nNeeded(a, Math.abs(verdict.delta)),
      mcnemar: mcnemarRange(Math.round((Math.abs(verdict.delta) / 100) * n), n),
      paired: [0.5, 1, 2, 5, 10]
        .map((pd) => ({ discordantPercent: pd, nNeeded: nNeededPaired(Math.abs(verdict.delta), pd) }))
        .filter((x) => x.nNeeded !== null),
    }
  })

  const signs = new Set(rows.filter((r) => r.delta !== 0).map((r) => Math.sign(r.delta)))
  return {
    rows,
    totals: {
      metrics: rows.length,
      refused: rows.filter((r) => r.verdict === 'refused').length,
      different: rows.filter((r) => r.verdict === 'different').length,
      indistinguishable: rows.filter((r) => r.verdict === 'indistinguishable').length,
      directionsDisagree: signs.size > 1,
      detectableRows: rows[0].mdeRows,
      askedAboutRows: rows[0].rows,
      // The one sentence this project exists to make sayable.
      timesSmallerThanDetectable: rows[0].ratio,
    },
  }
}

const computed = compute(METRICS, n, meta)

const out = {
  built: new Date().toISOString().slice(0, 10),
  source: {
    what: "watch-it-think's published quantisation comparison, from its own meta.json",
    upstream: 'projects/watch-it-think/public/model/meta.json',
    file: 'data/meta.json',
    measuredAt: q.measuredAt,
    heldOutSentences: n,
    sha256,
    bytes: bytes.length,
    pairedTestRecorded: bytes.toString('utf8').toLowerCase().includes('mcnemar'),
    discordantCountsRecorded: bytes.toString('utf8').toLowerCase().includes('discordant'),
    why: 'Frozen and hashed because this project quotes it by number. A quotation of a file that has changed is a claim about a document nobody else has.',
  },
  ...computed,
}

writeFileSync(resolve(root, 'src/generated/evaluation.json'), JSON.stringify(out, null, 2) + String.fromCharCode(10))

console.log(`data/meta.json   ${(bytes.length / 1024).toFixed(0)} KB, sha256 ${sha256.slice(0, 16)}...`)
console.log(`${n.toLocaleString('en-US')} held out sentences, measured ${q.measuredAt}`)
console.log(`paired test recorded: ${out.source.pairedTestRecorded}, discordant counts: ${out.source.discordantCountsRecorded}`)
console.log()
for (const r of out.rows) {
  console.log(`  ${r.verdict.padEnd(18)} ${r.label.padEnd(36)} ${String(r.rows).padStart(5)} rows, detects ${r.mdeRows}`)
}
console.log()
console.log(`${out.totals.refused} of ${out.totals.metrics} comparisons refused.`)
console.log(`The headline metric is ${out.totals.timesSmallerThanDetectable}x smaller than the smallest this sample could see.`)
