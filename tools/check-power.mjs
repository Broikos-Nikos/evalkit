/**
 * Every figure recomputes from the committed evaluation.
 *
 *   npm run check:power
 *
 * `check:refusal` tests the behaviour and `check:input` tests the provenance.
 * This tests the arithmetic: read the frozen file, run the same functions again,
 * and require the committed JSON to match in every field.
 *
 * A generated file that nobody regenerates is a cache, and a cache nobody
 * invalidates is a lie with a timestamp on it.
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { halfWidth, minimumDetectable, nNeeded, nNeededPaired, mcnemarRange, judge } from '../src/lib/power.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ev = JSON.parse(readFileSync(resolve(root, 'src/generated/evaluation.json'), 'utf8'))
const meta = JSON.parse(readFileSync(resolve(root, 'data/meta.json'), 'utf8'))
const q = meta.quantisation
const n = q.heldOutSentences

let failed = 0
const fail = (what, detail) => {
  failed++
  console.error(`FAIL  ${what}`)
  if (detail) console.error(`      ${detail}`)
}

const METRICS = [
  ['intent accuracy', q.fp32.intentAccuracy, q.int8.intentAccuracy],
  ['tag accuracy', q.fp32.tagAccuracy, q.int8.tagAccuracy],
  ['exact match', q.fp32.exactMatch, q.int8.exactMatch],
  ['intent accuracy, allowed to decline', q.fp32.withAbstain.intentAccuracy, q.int8.withAbstain.intentAccuracy],
]

if (ev.source.heldOutSentences !== n) {
  fail(`the committed sample size is ${ev.source.heldOutSentences} and the input says ${n}`)
}

const drift = []
const cmp = (path, a, b) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    drift.push(`${path}: committed ${JSON.stringify(a)}, recomputed ${JSON.stringify(b)}`)
  }
}

if (ev.rows.length !== METRICS.length) {
  fail(`${ev.rows.length} rows committed, the input has ${METRICS.length} metrics`)
} else {
  for (const [i, [name, a, b]] of METRICS.entries()) {
    const r = ev.rows[i]
    const fresh = judge(a, b, n, { label: name })
    cmp(`rows[${i}].label`, r.label, name)
    for (const k of ['a', 'b', 'delta', 'rows', 'mde', 'mdeRows', 'ratio', 'verdict', 'sayable']) {
      cmp(`rows[${i}].${k}`, r[k], fresh[k])
    }
    cmp(`rows[${i}].halfWidthPp`, r.halfWidthPp, Number(halfWidth(a, n).toFixed(2)))
    cmp(`rows[${i}].nNeeded`, r.nNeeded, nNeeded(a, Math.abs(fresh.delta)))
    cmp(`rows[${i}].mcnemar`, r.mcnemar, mcnemarRange(Math.round((Math.abs(fresh.delta) / 100) * n), n))
    cmp(
      `rows[${i}].paired`,
      r.paired,
      [0.5, 1, 2, 5, 10]
        .map((pd) => ({ discordantPercent: pd, nNeeded: nNeededPaired(Math.abs(fresh.delta), pd) }))
        .filter((x) => x.nNeeded !== null),
    )
  }
}

const signs = new Set(ev.rows.filter((r) => r.delta !== 0).map((r) => Math.sign(r.delta)))
cmp('totals.refused', ev.totals.refused, ev.rows.filter((r) => r.verdict === 'refused').length)
cmp('totals.different', ev.totals.different, ev.rows.filter((r) => r.verdict === 'different').length)
cmp('totals.indistinguishable', ev.totals.indistinguishable, ev.rows.filter((r) => r.verdict === 'indistinguishable').length)
cmp('totals.directionsDisagree', ev.totals.directionsDisagree, signs.size > 1)
/*
 * The headline row, by name.
 *
 * The three totals below are the numbers the page leads with, and they used to
 * be read off `ev.rows[0]` here and chosen as `rows[0]` where the file is
 * written, so the gate and the page agreed about a position rather than about a
 * metric. Reordering the metrics would have moved both together and this would
 * still have printed ok.
 */
const headlineIndex = ev.rows.findIndex((r) => r.label === ev.headlineMetric)
if (headlineIndex < 0) {
  fail(
    `evaluation.json says its headline metric is ${JSON.stringify(ev.headlineMetric)}, and no row carries that label`,
    `the rows are ${ev.rows.map((r) => JSON.stringify(r.label)).join(', ')}`,
  )
}
const headline = ev.rows[headlineIndex] ?? ev.rows[0]

cmp('totals.detectableRows', ev.totals.detectableRows, headline.mdeRows)
cmp('totals.thresholdOverMeasured', ev.totals.thresholdOverMeasured, headline.ratio)

// The minimum detectable effect is the number the refusal turns on, so it is
// recomputed from first principles rather than read back out of the row it
// already appears in. The metric it recomputes is the one named as the
// headline, located in this file's own independent copy of the inputs.
const headlineMetric = METRICS.find(([name]) => name === ev.headlineMetric) ?? METRICS[0]
cmp('the minimum detectable effect', headline.mde, Number(minimumDetectable(headlineMetric[1], n).toFixed(2)))

if (drift.length > 0) {
  fail(
    `the committed figures disagree with the library in ${drift.length} place${drift.length === 1 ? '' : 's'}`,
    drift.join(String.fromCharCode(10) + '      '),
  )
} else {
  console.log(`  ok      ${ev.rows.length} metrics and ${Object.keys(ev.totals).length} totals recompute to exactly what is committed`)
}

if (failed > 0) {
  console.error('\nA generated file nobody regenerates is a cache, and a cache nobody invalidates is a lie with a timestamp.')
  process.exit(1)
}

console.log('power: every figure recomputes from the committed evaluation')
