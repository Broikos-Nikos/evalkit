/**
 * Record the instrument being dragged across its own threshold.
 *
 *   npm run capture
 *
 * The whole page is one gesture: a bar that does not reach a line, a hand that
 * drags it past, and a verdict that turns over. That is not describable in a
 * sentence a recruiter will read, so it is recorded.
 *
 * Choreographed against measured geometry rather than framed by eye. Taken on
 * 2026-09-24, viewport 1280 wide, page 1,371 tall:
 *
 *   the rig        407 to 738
 *   the bar        432, and the threshold line inside it
 *   the slider     530
 *   the verdict    603
 *   the four real comparisons  771 to 1,001
 *
 * So the frame scrolls to 390 and the cause, the effect and the four published
 * verdicts are on one screen with nothing off the edge.
 *
 * **It is a real mouse drag, not a value assignment.** `slider.value = x` moves
 * the thumb with no hand behind it, and the argument of this page is that a
 * person is doing this. The thumb is picked up at the published difference, 5
 * rows, pulled past the line at 178, and put back where it started, because the
 * loop has to read as a comparison rather than as an animation with a happy
 * ending: the point is that the difference somebody published is the one that
 * cannot be called.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, renameSync, rmSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { serve } from './serve.mjs'
import { lookAt, FINAL_VERDICT } from './capture-state.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'docs/evalkit.gif')
const WORK = resolve(root, '.capture')

const SIZE = { width: 1280, height: 780 }
/*
 * The frame is cropped to the instrument, and that was measured rather than
 * preferred.
 *
 * The first version filmed the whole 780 pixel viewport, which GitHub renders
 * into 880 and a phone into about 356. Rendered at 356 the body text, the four
 * comparison rows and the caption were all illegible: a smear. `watch-it-think`
 * had the identical finding from a recruiter audit and recorded the only lever
 * there is, which is not a better encoder but a tighter frame, because the
 * output width is fixed and the type size is set by how much page is in shot.
 *
 * The rig runs 407 to 738 on the page and sits at 17 to 348 once scrolled, so
 * 380 pixels from the top of the frame holds the bar, the threshold line, the
 * slider, the verdict and its sentence, and nothing else. That doubles the type
 * in the output. The four published comparisons are a markdown table in the
 * README, where they can be read rather than squinted at.
 */
const CROP = 'crop=1280:380:0:0'
const FPS = 8
const WIDTH = 880
const SCROLL = 390

rmSync(WORK, { recursive: true, force: true })
mkdirSync(WORK, { recursive: true })

const server = await serve()
let looked
let seconds

try {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: SIZE,
    deviceScaleFactor: 1,
    recordVideo: { dir: WORK, size: SIZE },
  })
  const videoStart = Date.now()

  const page = await context.newPage()
  await page.goto(server.url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('[data-verdict]')?.textContent !== 'loading', null, { timeout: 60_000 })

  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), SCROLL)
  await page.waitForTimeout(500)

  const startedAt = Date.now()

  const slider = page.locator('[data-rows]')
  const box = await slider.boundingBox()
  if (!box) {
    console.error('FAIL  the slider has no box, so there is nothing to drag')
    process.exit(1)
  }
  const max = Number(await slider.getAttribute('max'))
  const start = Number(await slider.inputValue())
  /*
   * The usable track is inset by half a thumb, and the endpoints matter.
   *
   * Without the inset the return drag began with a mousedown at exactly
   * `box.x + box.width`, which is the boundary of the element and lands outside
   * it: the first drag ran 5 to 250 and the second did nothing at all, leaving
   * the recording on `different` when it is supposed to end on the difference
   * that was actually published. Measured, not guessed: the box is 942 wide and
   * the value stayed at 250 through the whole second pass.
   *
   * A browser maps a range input's value across the track minus the thumb, so
   * insetting by half a thumb is both the fix and the correct model.
   */
  const THUMB = 8
  const xAt = (rows) => box.x + THUMB + (rows / max) * (box.width - 2 * THUMB)
  const y = box.y + box.height / 2

  // Open on the published difference, refused, with the bar nowhere near the
  // line. It looks like a mistake for a second and then it is the point.
  await page.waitForTimeout(1500)

  // Pick the thumb up and pull it past the threshold, in steps small enough to
  // be a movement rather than a jump.
  await page.mouse.move(xAt(start), y)
  await page.mouse.down()
  for (let r = start; r <= max; r += 4) {
    await page.mouse.move(xAt(r), y)
    await page.waitForTimeout(16)
  }
  await page.mouse.move(xAt(max), y)
  await page.mouse.up()
  await page.waitForTimeout(1800)

  // And back, because the difference that was actually published is the one
  // that cannot be called, and that is where the argument lives.
  await page.mouse.move(xAt(max), y)
  await page.mouse.down()
  for (let r = max; r >= start; r -= 4) {
    await page.mouse.move(xAt(r), y)
    await page.waitForTimeout(16)
  }
  await page.mouse.move(xAt(start), y)
  await page.mouse.up()
  await page.waitForTimeout(2200)

  looked = await page.evaluate(lookAt)
  seconds = (Date.now() - startedAt) / 1000

  // A recording of the wrong state is worse than no recording.
  if (looked.state.verdict !== FINAL_VERDICT) {
    console.error(`FAIL  the recording ends on ${JSON.stringify(looked.state.verdict)}, not ${FINAL_VERDICT}`)
    process.exit(1)
  }

  /*
   * And the threshold line has to be in shot, because the image is a bar that
   * does not reach it. A recording of the bar alone shows a slider moving and
   * argues nothing.
   */
  const line = await page.evaluate(() => {
    const el = document.querySelector('.rig__scale')
    if (!el) return null
    const b = el.getBoundingClientRect()
    const frac = Number(getComputedStyle(el).getPropertyValue('--threshold'))
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), x: Math.round(b.left + frac * b.width), vw: window.innerWidth, vh: window.innerHeight, frac }
  })
  if (!line || line.top < 0 || line.bottom > line.vh || line.x < 0 || line.x > line.vw || !(line.frac > 0 && line.frac < 1)) {
    console.error('FAIL  the threshold line is not in frame, so the recording shows a bar with nothing to reach')
    console.error(`      line at x=${line?.x} in a ${line?.vw} wide frame, bar ${line?.top} to ${line?.bottom} of ${line?.vh}`)
    process.exit(1)
  }

  await context.close()
  await browser.close()

  const video = readdirSync(WORK).find((f) => f.endsWith('.webm'))
  if (!video) {
    console.error('FAIL  playwright wrote no video')
    process.exit(1)
  }
  const webm = resolve(WORK, video)

  // Before ffmpeg, not after. watch-it-think's first capture died pointing at
  // its own output directory.
  mkdirSync(resolve(root, 'docs'), { recursive: true })

  const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
  const palette = resolve(WORK, 'palette.png')
  const filters = `${CROP},fps=${FPS},scale=${WIDTH}:-1:flags=lanczos`

  const LEAD_IN = 0.4
  const offset = Math.max(0, (startedAt - videoStart) / 1000 - LEAD_IN)
  const trim = ['-ss', String(offset)]

  /*
   * Sixteen colours, undithered. Measured in `chunkline` on the same kind of
   * frame: playwright records lossy webm, so two frames of a still page are not
   * identical and GIF pays for everything that changes, and a small palette
   * quantises that noise away. This page is flatter still, one background, one
   * card, three greys and the accent.
   */
  ff([...trim, '-i', webm, '-vf', `${filters},palettegen=max_colors=16:stats_mode=diff`, palette])
  ff([
    ...trim, '-i', webm,
    '-i', palette,
    '-lavfi', `${filters}[x];[x][1:v]paletteuse=dither=none`,
    '-loop', '0',
    OUT,
  ])

  renameSync(webm, resolve(root, 'docs/evalkit.webm'))
  rmSync(WORK, { recursive: true, force: true })

  writeFileSync(
    resolve(root, 'docs/capture.json'),
    JSON.stringify({ recorded: new Date().toISOString().slice(0, 10), looked }, null, 2) + String.fromCharCode(10),
  )
} finally {
  server.stop()
}

const { size } = await import('node:fs').then((m) => m.promises.stat(OUT))
console.log(`docs/evalkit.gif   ${(size / 1e6).toFixed(2)} MB at ${FPS} fps, ${WIDTH}px wide`)
console.log(`docs/evalkit.webm  kept alongside it, for anywhere that takes video`)
console.log(`ends on ${looked.state.verdict} at ${looked.state.rows} rows, ${seconds.toFixed(1)}s of action`)
