/**
 * The page states what the library computes, and its instrument agrees with its
 * own headline.
 *
 *   npm run check:page
 *
 * `check:power` proves the figures come out of the committed evaluation and
 * `check:refusal` proves the library behaves. Neither of them opens the page,
 * and the page is the only surface a reader ever sees.
 *
 * That gap cost a real defect within the hour. `main.ts` computed the threshold
 * itself, with `Math.round` where the library uses `Math.ceil`, and printed
 * **"This evaluation can tell 177 rows apart"** over an instrument that refused
 * 177 and accepted 178. Every other gate was green. The headline claimed one row
 * more precision than the page's own slider would give, which is the failure
 * this project is named after, on the front of the project.
 *
 * So this checks two things a file comparison cannot:
 *
 * 1. **The figures on screen are the committed ones**, as phrases rather than
 *    bare integers, because `watch-it-think` held a claim as the string "6" in a
 *    README containing nineteen of them and it could not fail.
 * 2. **The instrument turns over where the headline says it does.** Drag it to
 *    the stated threshold and the verdict must change; drag it one row below and
 *    it must not. The headline and the slider are two renderings of one number
 *    and this is what makes them stay one number.
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ev = JSON.parse(readFileSync(resolve(root, 'src/generated/evaluation.json'), 'utf8'))

let failed = 0
const fail = (what, detail) => {
  failed++
  console.error(`FAIL  ${what}`)
  if (detail) console.error(`      ${detail}`)
}

const n = ev.source.heldOutSentences
const h = ev.rows[0]
const num = (x) => x.toLocaleString('en-US')

const CLAIMS = [
  ['the headline, both halves', `can tell ${h.mdeRows} rows apart. It was asked about ${h.rows}.`],
  ['the sample size', `${num(n)} held out sentences`],
  ['the threshold in the standfirst', `a sample this size can detect is ${h.mdeRows}`],
  ['the ratio', `${ev.totals.timesSmallerThanDetectable} times larger`],
  ['the count of refusals', `${ev.totals.refused} of ${ev.totals.metrics} are refused`],
  ['the threshold in the caption', `it is ${h.mdeRows} rows because n is ${num(n)}`],
]

const { serve, useShared } = await import('./serve.mjs')
const server = process.env.EVALKIT_URL ? await useShared(process.env.EVALKIT_URL) : await serve()

try {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } })
  await page.goto(server.url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('[data-verdict]')?.textContent !== 'loading', null, { timeout: 60_000 })

  // innerText, not textContent: the question is what a visitor is looking at,
  // and a figure inside a hidden element is not a claim to anybody.
  const seen = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ')
  const missing = CLAIMS.filter(([, v]) => !seen.includes(v.replace(/\s+/g, ' ')))
  if (missing.length > 0) {
    fail(
      `${missing.length} of ${CLAIMS.length} figures the page should state are not on it`,
      missing.map(([what, v]) => `${what}: expected ${JSON.stringify(v)}`).join('; '),
    )
  } else {
    console.log(`  ok      ${CLAIMS.length} figures on the page are what the library computes`)
  }

  /*
   * The instrument, driven to its own line.
   *
   * This is the assertion that would have caught the headline saying 177 over a
   * slider that refused it. A page can read the right file, state a number from
   * it, and still contradict itself one control away.
   */
  const at = async (rows) => {
    await page.evaluate((v) => {
      const s = document.querySelector('[data-rows]')
      s.value = String(v)
      s.dispatchEvent(new Event('input'))
    }, rows)
    return page.evaluate(() => document.querySelector('[data-verdict]')?.dataset.verdict)
  }

  const probes = [
    [h.mdeRows, 'different', 'the threshold the headline states'],
    [h.mdeRows - 1, 'refused', 'one row below it'],
    [Math.round(h.rows), 'refused', 'the difference actually published'],
  ]
  const wrong = []
  for (const [rows, expected, what] of probes) {
    const got = await at(rows)
    if (got !== expected) wrong.push(`${what} (${rows} rows): expected ${expected}, the page says ${got}`)
  }
  if (wrong.length > 0) {
    fail(
      `the instrument disagrees with the headline in ${wrong.length} place${wrong.length === 1 ? '' : 's'}`,
      wrong.join(String.fromCharCode(10) + '      '),
    )
  } else {
    console.log(`  ok      the instrument turns over at ${h.mdeRows} rows, exactly where the headline says it does`)
  }

  // And the four published comparisons are drawn with the verdicts the library
  // gives them, in the page's own rows.
  const drawn = await page.evaluate(() =>
    [...document.querySelectorAll('.row')].map((r) => ({
      verdict: r.dataset.verdict,
      text: r.innerText.replace(/\s+/g, ' '),
    })),
  )
  const badRows = ev.rows.filter((r, i) => !drawn[i] || drawn[i].verdict !== r.verdict || !drawn[i].text.includes(`${r.rows} rows`))
  if (drawn.length !== ev.rows.length || badRows.length > 0) {
    fail(
      `${badRows.length || 'the wrong number of'} published comparisons are drawn with a verdict or a count that is not the library's`,
      badRows.map((r) => `${r.label}: ${r.verdict}, ${r.rows} rows`).join('; '),
    )
  } else {
    console.log(`  ok      all ${drawn.length} published comparisons are drawn with the library's own verdicts`)
  }

  await browser.close()
} finally {
  server.stop()
}

if (failed > 0) {
  console.error('\nA page can read the right file and still contradict itself one control away.')
  process.exit(1)
}

console.log('page: every figure a visitor sees is the library’s, and the instrument agrees with the headline')
