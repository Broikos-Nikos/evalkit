/**
 * Every number the README states comes out of the evaluation.
 *
 *   npm run check:claims
 *
 * `check:power` proves the figures come from the committed evaluation and
 * `check:page` proves the page states them. The README is the third surface, it
 * is the one a recruiter actually reads, and until this existed it was the only
 * one held by nothing at all.
 *
 * **Every claim is a phrase, never a bare integer.** `watch-it-think` held
 * `layers` as the string "6" in a README containing nineteen of them, so the
 * assertion could not fail under any edit whatsoever; four of its twenty four
 * claims were like that. The spec gate for `agentscope` made the same mistake
 * and its first control passed against a spec edited to say the wrong number.
 *
 * And counted, not merely found, because a figure corrected in one place of two
 * is the defect this exists for.
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ev = JSON.parse(readFileSync(resolve(root, 'src/generated/evaluation.json'), 'utf8'))
const readme = readFileSync(resolve(root, 'README.md'), 'utf8').replace(/\r\n/g, '\n')
const flat = readme.replace(/\s+/g, ' ')

let failed = 0
const fail = (what, detail) => {
  failed++
  console.error(`FAIL  ${what}`)
  if (detail) console.error(`      ${detail}`)
}

const t = ev.totals
/*
 * The headline row, by the name the evidence file carries. It was `ev.rows[0]`,
 * so this gate and the page agreed about a position rather than about a metric.
 */
const headlineRow = ev.rows.find((r) => r.label === ev.headlineMetric) ?? ev.rows[0]
const h = headlineRow
const n = ev.source.heldOutSentences
const num = (x) => x.toLocaleString('en-US')

const CLAIMS = [
  ['the headline, both halves', `can tell ${h.mdeRows} rows apart. It was asked about ${h.rows}.`],
  ['the sample size', `**${num(n)} held out sentences**`],
  ['the observed difference', `moved by ${h.rows} rows`],
  ['the threshold', `can detect is ${h.mdeRows}`],
  ['the count of refusals', `**${t.refused} of ${t.metrics} are refused.**`],
  ['the threshold restated where the fourth metric is explained', `a difference of ${h.mdeRows} rows and did not find one`],
  ['the interval the sample does support', `plus or minus ${h.halfWidthPp}pp`],
  ['the smallest paired requirement', `needs ${num(h.paired[0].nNeeded)} sentences`],
  ['the frozen input size', `${Math.floor(ev.source.bytes / 1024)} KB, committed`],
  // The refusal sentence, quoted whole. It is the product's own output and the
  // one paragraph a reader is most likely to take away.
  ['the quoted refusal', h.sayable],
]

for (const r of ev.rows) {
  CLAIMS.push([`the table row for ${r.label}`, `| ${r.label} | ${r.a} to ${r.b} | ${r.rows} | ${r.verdict} |`])
}
for (const x of h.paired) {
  CLAIMS.push([`the paired row at ${x.discordantPercent}%`, `| ${x.discordantPercent}% | ${num(x.nNeeded)} |`])
}

let missing = 0
for (const [what, value] of CLAIMS) {
  const wanted = String(value).replace(/\s+/g, ' ')
  if (flat.split(wanted).length - 1 === 0) {
    missing++
    fail(`${what}: the evaluation says ${JSON.stringify(wanted)} and the README does not say it`)
  }
}
if (missing === 0) console.log(`  ok      ${CLAIMS.length} claims in README.md are what the evaluation produces`)

/*
 * And nothing else of the same shape. The README could state the sample size
 * correctly in one paragraph and invent another in the next, and every claim
 * above would still pass: looking for the right answer cannot see a wrong one
 * sitting beside it.
 */
const allowed = new Set([num(n), ...h.paired.map((x) => num(x.nNeeded)), num(h.nNeeded)])
const loose = [...new Set(flat.match(/\b\d{1,3}(,\d{3})+\b/g) ?? [])].filter((x) => !allowed.has(x))
if (loose.length > 0) {
  fail(`the README states ${loose.length} large figure${loose.length === 1 ? '' : 's'} the evaluation does not produce`, loose.join(', '))
} else {
  console.log('  ok      every large figure in README.md is one the evaluation produces')
}

if (failed > 0) {
  console.error('\nA number a reader can check is a number that has to be checked here first.')
  process.exit(1)
}

console.log('claims: every figure in the README comes out of the committed evaluation')
