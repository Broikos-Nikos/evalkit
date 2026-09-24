/**
 * What the recording is a recording of, in one place.
 *
 * `capture.mjs` films the page and writes this down; `check-capture.mjs` drives
 * the page to the same state and compares. One function, used by both.
 *
 * Four projects in this workspace paid for this. `watch-it-think` shipped a
 * recording of a green page for two days after the page became flame and blue;
 * its first fix recorded eight colours and a typeface and then passed over a
 * recording showing a rewritten headline; `tokenlab`'s picture was correct only
 * because the capture happened to be re-run three minutes after its palette
 * changed.
 *
 * So this records the paint, the words **and** the state of the instrument. For
 * this page the state is the argument: a recording that ends on `refused` over a
 * page that now says `different` is a lie no matter what colour it is.
 */

/**
 * Where the recording stops, and why there.
 *
 * It ends back at the published difference, refused, rather than at the top of
 * the slider. The loop has to read as a comparison rather than as a one way
 * animation with a happy ending: the point is not that a large difference is
 * detectable, it is that the difference somebody actually published is not.
 * `tokenlab`'s capture learned the same thing and clicks back to the damage.
 */
export const FINAL_VERDICT = 'refused'

/**
 * Read the page. Runs inside the browser, in both tools.
 *
 * Wider than a palette on purpose. A gate written about a stale picture has to
 * look at everything a reader can see in the picture, and here that includes the
 * threshold, because the whole image is a bar that does or does not reach a line.
 */
export function lookAt() {
  const s = getComputedStyle(document.documentElement)
  const paint = {}
  for (const k of ['--ink', '--lift', '--edge', '--text', '--dim', '--faint', '--flame', '--flame-bright']) {
    paint[k] = s.getPropertyValue(k).trim()
  }
  paint.bodyFont = getComputedStyle(document.body).fontFamily
  paint.wash = getComputedStyle(document.body).backgroundColor

  const text = (sel) => document.querySelector(sel)?.textContent?.trim() ?? ''

  const words = {
    headline: text('[data-headline]'),
    wordmark: text('.wordmark'),
    verdict: text('[data-verdict]'),
  }

  const slider = document.querySelector('[data-rows]')
  const state = {
    verdict: document.querySelector('[data-verdict]')?.dataset?.verdict ?? '',
    rows: Number(slider?.value ?? -1),
    sliderMax: Number(slider?.max ?? -1),
    // The four published comparisons, as the table draws them. If the library
    // ever judges one differently, the picture below the fold is wrong too.
    verdicts: [...document.querySelectorAll('.row')].map((r) => r.dataset.verdict).join(','),
    rowCount: document.querySelectorAll('.row').length,
  }

  return { paint, words, state }
}
