/**
 * The picture at the top of the README is a picture of this page.
 *
 *   npm run check:capture
 *
 * Every other gate here reads source, a figure or the rendered DOM. None can see
 * that `docs/evalkit.gif` has become a photograph of a page that no longer
 * exists, and the README underneath says it is the real page.
 *
 * Paid for four times in this workspace already. `watch-it-think` shipped a
 * recording of a green page for two days after its palette became flame and
 * blue, and a recruiter audit found it in ten seconds; its first fix recorded
 * eight colours and a typeface, so it then passed over a recording showing a
 * headline that had been rewritten; `tokenlab`'s picture was correct only
 * because the capture happened to be re-run three minutes after its palette
 * changed.
 *
 * So the recording writes down the paint, the words and the state of the
 * instrument, and this drives the page back to the filmed state and compares all
 * three. For this page the state is the argument: a recording that ends on
 * `refused` over a page that now says `different` is a lie about the only thing
 * on it.
 */

import { readFileSync, existsSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { lookAt, FINAL_VERDICT } from './capture-state.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const record = resolve(root, 'docs/capture.json')
const gif = resolve(root, 'docs/evalkit.gif')

let failed = 0
const fail = (what, detail) => {
  failed++
  console.error(`FAIL  ${what}`)
  if (detail) console.error(`      ${detail}`)
}

if (!existsSync(gif)) {
  console.error('FAIL  docs/evalkit.gif is missing, and the README leads with it')
  process.exit(1)
}
if (!existsSync(record)) {
  console.error('FAIL  docs/capture.json is missing, so nothing records what the page looked like when it was filmed')
  console.error('      run npm run capture')
  process.exit(1)
}

const was = JSON.parse(readFileSync(record, 'utf8'))

/*
 * A record written by an older tool is refused, not partly believed. Comparing
 * whichever keys happen to be present means that the day the capture learns to
 * write down something new, this goes on passing without it.
 */
for (const part of ['paint', 'words', 'state']) {
  if (!was.looked || typeof was.looked[part] !== 'object') {
    fail(`docs/capture.json records no ${part}, so it was made before this gate read ${part}`, 'Run npm run capture.')
  }
}
if (failed > 0) process.exit(1)

if (was.looked.state.verdict !== FINAL_VERDICT) {
  fail(`the recording ends on ${was.looked.state.verdict} and this gate checks ${FINAL_VERDICT}`)
}

const { serve, useShared } = await import('./serve.mjs')
const server = process.env.EVALKIT_URL ? await useShared(process.env.EVALKIT_URL) : await serve()

try {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 780 } })
  await page.goto(server.url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('[data-verdict]')?.textContent !== 'loading', null, { timeout: 60_000 })

  /*
   * The recording ends where the page opens, at the published difference, so no
   * driving is needed here. That is worth saying rather than assuming: if the
   * capture is ever re-choreographed to stop somewhere else, this comparison
   * silently becomes one against the wrong frame, and the state check below is
   * what catches it.
   */
  await page.waitForTimeout(250)
  const now = await page.evaluate(lookAt)

  const drifted = []
  for (const part of ['paint', 'words', 'state']) {
    for (const [k, v] of Object.entries(was.looked[part])) {
      if (now[part][k] !== v) {
        drifted.push(`${part}.${k}: filmed ${JSON.stringify(v)}, page is ${JSON.stringify(now[part][k])}`)
      }
    }
  }

  if (drifted.length > 0) {
    fail(
      `the page has changed in ${drifted.length} way${drifted.length === 1 ? '' : 's'} since the recording was made on ${was.recorded}`,
      drifted.join(String.fromCharCode(10) + '      ') +
        String.fromCharCode(10) + '      Run npm run capture. The README calls this the real page.',
    )
  } else {
    console.log(
      `  ok      the recording of ${was.recorded} is of this page: ${was.looked.state.verdict} at ` +
        `${was.looked.state.rows} rows, ${was.looked.state.rowCount} comparisons drawn ${was.looked.state.verdicts}`,
    )
  }

  await browser.close()
} finally {
  server.stop()
}

/*
 * The README claims the picture is the real page. If that sentence goes, this
 * gate guards nothing. Matched with `includes` on a flattened README: the
 * version of this in `watch-it-think` used a regular expression and twice tested
 * my memory of the wording rather than the wording.
 */
const readme = readFileSync(resolve(root, 'README.md'), 'utf8').replace(/\s+/g, ' ')
const CLAIM = 'That is the real page in a real browser, recorded by `npm run capture`'
if (!readme.includes(CLAIM)) {
  fail('the README no longer claims the picture is the real page, so this gate is guarding nothing', `looked for: ${JSON.stringify(CLAIM)}`)
} else {
  console.log('  ok      the README makes the claim this gate exists to keep true')
}

const mb = statSync(gif).size / 1e6
// The cap sits just above what the tool produces, not comfortably above it. A
// ceiling with slack in it lets a file grow silently, which is the same
// mechanism tools/check-queue.mjs ratchets against in the findings queue.
if (mb > 0.35) {
  fail(`docs/evalkit.gif is ${mb.toFixed(2)} MB`, 'fewer frames and a shorter run, not a better encoder')
} else {
  console.log(`  ok      docs/evalkit.gif is ${mb.toFixed(2)} MB`)
}

if (failed > 0) {
  console.error('\nThe picture at the top is the only thing most people will look at.')
  process.exit(1)
}

console.log('capture: the picture shows the page that exists, and the README can say so')
