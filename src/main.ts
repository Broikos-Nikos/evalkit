import './style.css'
import evaluation from './generated/evaluation.json'
// @ts-expect-error the library is plain JavaScript, shared with the gates on
// purpose: a typed second copy for the browser is two implementations of the
// same arithmetic, which agree about a mistake sooner or later.
import { judge } from './lib/power.mjs'

/**
 * An instrument for the question an evaluation is usually not asked.
 *
 * Every figure comes from `generated/evaluation.json`, which `npm run
 * build:input` computes from `data/meta.json`, a frozen and hashed copy of a
 * published evaluation. `npm run check:power` refuses them to disagree and
 * `npm run check:refusal` tests the behaviour rather than the numbers.
 *
 * **The control is the difference, not the sample size, and that was measured
 * rather than chosen.** The spec said to drag the sample size. Holding the
 * observed difference and moving n, the verdict flips at 11,904,074 sentences,
 * which is 1,125 times the set that exists: a slider over three decades whose
 * useful region is a sliver. Holding n and moving the difference, it flips at
 * 177 rows against an observed 5.3, a span of 34 times, one screen, in the unit
 * the runner already speaks.
 *
 * Rows, not percentage points, everywhere a reader looks. "5 rows out of 10,578"
 * is read correctly by everybody. "0.05pp" is read correctly by people who were
 * going to get this right anyway.
 */

const el = {
  headline: document.querySelector<HTMLElement>('[data-headline]')!,
  standfirst: document.querySelector<HTMLElement>('[data-standfirst]')!,
  scale: document.querySelector<HTMLElement>('[data-scale]')!,
  rows: document.querySelector<HTMLInputElement>('[data-rows]')!,
  rowsValue: document.querySelector<HTMLOutputElement>('[data-rows-value]')!,
  verdict: document.querySelector<HTMLElement>('[data-verdict]')!,
  sayable: document.querySelector<HTMLElement>('[data-sayable]')!,
  table: document.querySelector<HTMLElement>('[data-table]')!,
  caption: document.querySelector<HTMLElement>('[data-caption]')!,
  footer: document.querySelector<HTMLElement>('[data-footer]')!,
}

const ev = evaluation
const n = ev.source.heldOutSentences
/*
 * The row this page leads with, found by the name the evidence file carries
 * rather than by its position in the list. It was `ev.rows[0]`, so reordering
 * the metrics in `tools/build-input.mjs` would have moved the headline, the
 * threshold under it and the number in the box, silently.
 */
const headline = ev.rows.find((r) => r.label === ev.headlineMetric) ?? ev.rows[0]!
const base = headline.a

/**
 * Where the verdict turns over, in rows, taken from the library rather than
 * recomputed here.
 *
 * The first version of this line was
 * `Math.round((minimumDetectable(base, n) / 100) * n)`, which is the same
 * arithmetic as `judge()` does with a different rounding, and it printed 177
 * where the library says 178. The page's headline claimed a precision the page's
 * own instrument refused, one row below its own line.
 *
 * The library's header says, in as many words, that a second copy of this
 * arithmetic for the browser would be two implementations that agree about a
 * mistake sooner or later. It took an hour, and they did not even manage to
 * agree.
 */
const thresholdRows: number = headline.mdeRows

/** The slider's top end: enough past the threshold that it is visibly past it. */
const MAX_ROWS = Math.ceil((thresholdRows * 1.4) / 10) * 10

function draw(): void {
  const rows = Number(el.rows.value)
  // Back to a percentage for the library, which thinks in proportions, and
  // straight back to rows for the reader, who does not.
  const b = base + (rows / n) * 100
  const r = judge(base, b, n, { label: 'the difference' })

  el.rowsValue.textContent = `${rows} rows of ${n.toLocaleString('en-US')}`

  el.verdict.dataset.verdict = r.verdict
  el.verdict.textContent =
    r.verdict === 'refused'
      ? 'refused: this sample cannot tell'
      : r.verdict === 'indistinguishable'
        ? 'no difference to report'
        : 'a real difference'
  el.sayable.textContent = r.sayable

  el.scale.style.setProperty('--at', String(rows / MAX_ROWS))
  el.scale.style.setProperty('--threshold', String(thresholdRows / MAX_ROWS))
  el.scale.dataset.verdict = r.verdict
}

function drawTable(): void {
  const head = document.createElement('p')
  head.className = 'table__head'
  head.textContent =
    `The four comparisons that evaluation actually published, judged. ` +
    `${ev.totals.refused} of ${ev.totals.metrics} are refused.`

  const rows = ev.rows.map((r) => {
    const row = document.createElement('div')
    row.className = 'row'
    row.dataset.row = ''
    row.dataset.verdict = r.verdict

    const name = document.createElement('span')
    name.className = 'row__name'
    name.textContent = r.label

    const figure = document.createElement('span')
    figure.className = 'row__figure'
    figure.textContent = `${r.a} to ${r.b}`

    const rowsCell = document.createElement('span')
    rowsCell.className = 'row__rows'
    rowsCell.textContent = `${r.rows} rows`

    const verdict = document.createElement('span')
    verdict.className = 'row__verdict'
    verdict.textContent = r.verdict

    row.append(name, figure, rowsCell, verdict)
    return row
  })

  el.table.replaceChildren(head, ...rows)
}

function boot(): void {
  el.headline.textContent =
    `This evaluation can tell ${thresholdRows} rows apart. It was asked about ${headline.rows}.`

  el.standfirst.textContent =
    `A published comparison of two models on ${n.toLocaleString('en-US')} held out sentences, measured ` +
    `${ev.source.measuredAt}. Its headline metric moved by ${headline.rows} rows, and the smallest ` +
    `difference a sample this size can detect is ${thresholdRows}: ` +
    `${ev.totals.thresholdOverMeasured} times the thing being reported. ` +
    `Drag the difference and watch the verdict turn over.`

  el.rows.max = String(MAX_ROWS)
  el.rows.value = String(Math.round(headline.rows))

  el.caption.textContent =
    `The threshold is the smallest difference this sample could detect at 95% confidence with 80% power, ` +
    `and it is ${thresholdRows} rows because n is ${n.toLocaleString('en-US')}: it moves with the sample, not with the ` +
    `question. Everything is stated in rows because that is the unit the reader can check. ` +
    `These are two proportions on the same sentences, so the correct test is McNemar's on the ` +
    `discordant pairs; those counts were never recorded, so the conservative unpaired ` +
    `calculation is used and says so.`

  el.footer.textContent =
    `Computed from data/meta.json, ${(ev.source.bytes / 1024).toFixed(0)} KB frozen on ${ev.built}, ` +
    `sha256 ${ev.source.sha256.slice(0, 16)}. It is committed because this page quotes another repository ` +
    `by number, and a quotation of a file that has changed is a claim about a document nobody else has.`

  el.rows.addEventListener('input', draw)
  drawTable()
  draw()
}

boot()
