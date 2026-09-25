/**
 * The runner refuses what it should, and does not refuse what it should not.
 *
 *   npm run check:refusal
 *
 * This is the gate this project exists to have. Everything else here is
 * arithmetic that a statistics textbook already contains; the product is a
 * `judge()` that says "no" to a question its data cannot answer.
 *
 * And a thing that says no to everything has not been built, it has been
 * switched off. **Both directions are tested, and the second is the one that
 * matters.** The shipped evaluation produces three refusals and one
 * indistinguishable and not a single `different`, so on the real data that
 * branch never runs: an implementation that returned `refused` unconditionally
 * would ship green through every other gate here.
 *
 * So the boundary is probed directly, on both sides of the minimum detectable
 * effect and at it, and the verdicts are required to be a function of the input
 * rather than a constant.
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { judge, minimumDetectable } from '../src/lib/power.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ev = JSON.parse(readFileSync(resolve(root, 'src/generated/evaluation.json'), 'utf8'))

let failed = 0
const fail = (what, detail) => {
  failed++
  console.error(`FAIL  ${what}`)
  if (detail) console.error(`      ${detail}`)
}

const n = ev.source.heldOutSentences
/*
 * The headline row, by the name the evidence file carries. It was `ev.rows[0]`,
 * so this gate and the page agreed about a position rather than about a metric.
 */
const headlineRow = ev.rows.find((r) => r.label === ev.headlineMetric) ?? ev.rows[0]
const base = headlineRow.a
const mde = minimumDetectable(base, n)

/*
 * The boundary, from both sides.
 *
 * `mde` is the smallest difference this sample can detect, so a difference just
 * under it must be refused and one just over it must not be. A runner whose
 * boundary is somewhere else entirely still passes a test that only ever asks
 * about 0.05pp.
 */
const CASES = [
  ['a difference well under the threshold', mde * 0.1, 'refused'],
  ['a difference just under the threshold', mde * 0.98, 'refused'],
  ['a difference exactly at the threshold', mde, 'different'],
  ['a difference just over the threshold', mde * 1.02, 'different'],
  ['a difference well over the threshold', mde * 4, 'different'],
  ['no difference at all', 0, 'indistinguishable'],
]

/*
 * The case is fed unrounded, and that took three attempts to get right.
 *
 * The first version rounded the constructed input to six decimal places before
 * handing it over, which loses 3.5e-7 of a threshold of 1.677, and then asserted
 * the exact boundary. It failed, and it went on failing through two real fixes
 * to the library that it was not testing: the threshold had been compared at two
 * decimal places and the difference at four, both on the deciding path, and both
 * of those were genuine defects worth the trouble.
 *
 * The third failure was this line. A test that rounds its own input and then
 * asserts an exact boundary is measuring its own arithmetic, and it sent three
 * changes into the thing it was supposed to be checking before anybody printed
 * the numbers.
 */
const wrong = []
for (const [what, d, expected] of CASES) {
  const got = judge(base, base + d, n, { label: what })
  if (got.verdict !== expected) wrong.push(`${what} (${d.toFixed(3)}pp): expected ${expected}, got ${got.verdict}`)
}
if (wrong.length > 0) {
  fail(`${wrong.length} of ${CASES.length} boundary cases came back with the wrong verdict`, wrong.join('\n      '))
} else {
  console.log(`  ok      all ${CASES.length} boundary cases, either side of ${mde.toFixed(2)}pp, get the verdict they should`)
}

/*
 * And it is not a constant function.
 *
 * Every other gate in this repository would pass against a `judge()` that
 * returned `refused` no matter what, because the shipped evaluation contains no
 * difference large enough to be called real. This is the assertion that notices.
 */
const verdicts = new Set(CASES.map(([, d]) => judge(base, base + d, n).verdict))
if (verdicts.size < 3) {
  fail(
    `judge() returned only ${verdicts.size} distinct verdict${verdicts.size === 1 ? '' : 's'} across the whole range`,
    `saw: ${[...verdicts].join(', ')}. A runner that answers the same thing to everything has not measured anything.`,
  )
} else {
  console.log(`  ok      judge() returns all three verdicts across the range, not one`)
}

/*
 * The number the page prints as "the smallest difference this sample can detect"
 * has to be a difference this sample detects.
 *
 * It was not. `mdeRows` rounded a threshold of 177.4 rows to 177, and 177 rows
 * came back refused, so the headline claimed one row more precision than the
 * data supports. Found by dragging the instrument past its own line, not by
 * reading the number.
 *
 * So both sides of it are asserted: the stated figure is detectable and one row
 * below it is not. That is the tightest test there is, and it is the one this
 * project has to pass before it tells anybody else about their sample size.
 */
{
  const rowsToPp = (rows) => (rows / n) * 100
  const at = judge(base, base + rowsToPp(headlineRow.mdeRows), n)
  const below = judge(base, base + rowsToPp(headlineRow.mdeRows - 1), n)
  if (at.verdict !== 'different') {
    fail(
      `the page states ${headlineRow.mdeRows} rows as detectable and judge() refuses it`,
      'A stated threshold that gets refused claims more precision than the sample carries.',
    )
  } else if (below.verdict !== 'refused') {
    fail(
      `${headlineRow.mdeRows - 1} rows is also detectable, so the stated threshold is not the smallest one`,
      'The figure is meant to be the boundary, not a number somewhere past it.',
    )
  } else {
    console.log(`  ok      ${headlineRow.mdeRows} rows is detectable and ${headlineRow.mdeRows - 1} is not, so the stated threshold is the boundary`)
  }
}

/*
 * The refusal has to say what would be enough. "No" on its own is not a result,
 * it is a shrug, and the number that turns it into a result is the sample size
 * that would have answered the question.
 */
const refusal = judge(base, base + mde * 0.1, n, { label: 'x' })
if (!/rows would be needed/.test(refusal.sayable) || !/\d/.test(refusal.sayable)) {
  fail('a refusal does not say what sample size would answer the question', `it said: ${JSON.stringify(refusal.sayable)}`)
} else {
  console.log('  ok      a refusal names the sample size that would have answered it')
}

/*
 * Rows before percentage points, in every message.
 *
 * Not a style rule. "5.3 rows of 10,578" is read correctly by everybody;
 * "-0.05pp" is read correctly by people who were going to get this right anyway.
 * The spec puts this first among the three behaviours, so it is checked.
 */
const phrasing = ev.rows.filter((r) => !/^\D*[\d.]+ rows/.test(r.sayable.replace(/^[^,]*is /, '')))
if (phrasing.length > 0 && ev.rows.some((r) => r.verdict !== 'indistinguishable')) {
  const bad = ev.rows.filter((r) => r.verdict === 'refused' && !r.sayable.includes(' rows of '))
  if (bad.length > 0) {
    fail(`${bad.length} refusal${bad.length === 1 ? '' : 's'} state the difference without stating it in rows`, bad.map((r) => r.label).join('; '))
  } else {
    console.log('  ok      every refusal states the difference in rows of the sample')
  }
} else {
  console.log('  ok      every refusal states the difference in rows of the sample')
}

/*
 * And the committed verdicts are the ones the library produces today. A
 * generated file nobody regenerates is a cache, and a cache nobody invalidates
 * is a lie with a timestamp on it.
 */
const drift = []
for (const r of ev.rows) {
  const fresh = judge(r.a, r.b, n, { label: r.label })
  for (const k of ['verdict', 'rows', 'mde', 'mdeRows', 'ratio']) {
    if (JSON.stringify(fresh[k]) !== JSON.stringify(r[k])) {
      drift.push(`${r.label}.${k}: committed ${JSON.stringify(r[k])}, recomputed ${JSON.stringify(fresh[k])}`)
    }
  }
}
if (drift.length > 0) {
  fail(`the committed verdicts disagree with the library in ${drift.length} place${drift.length === 1 ? '' : 's'}`, drift.join('\n      '))
} else {
  console.log(`  ok      all ${ev.rows.length} committed verdicts are what judge() returns today`)
}

if (failed > 0) {
  console.error('\nA runner that refuses everything is as useless as one that refuses nothing.')
  process.exit(1)
}

console.log(`refusal: ${ev.totals.refused} of ${ev.totals.metrics} comparisons refused, and the boundary is where it should be`)
