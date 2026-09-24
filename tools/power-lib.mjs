/**
 * The arithmetic, in one place, and the refusal built on top of it.
 *
 * `build-input.mjs` runs this over the committed evaluation and freezes the
 * result. `check-power.mjs` runs the same functions again and requires the
 * committed JSON to match. `check-refusal.mjs` tests the behaviour rather than
 * the numbers. Two implementations of the same arithmetic agree about a mistake
 * sooner or later, which this workspace has now written down five times.
 *
 * ## The question everybody asks, and the one that decides
 *
 * The question asked of an evaluation is "is A better than B". The question that
 * decides whether that one can be answered is **"what is the smallest difference
 * this sample could have detected at all"**, and almost nothing prints it.
 *
 * Measured on the evaluation this project ships with, `watch-it-think`'s
 * quantisation comparison on 10,578 held out sentences:
 *
 *   it can detect          177 rows      1.68pp
 *   it is being asked about  5.3 rows     0.05pp
 *
 * Thirty four times smaller than the smallest thing the sample could see. That
 * is not a close call needing a footnote. It is a question the data cannot be
 * asked, and `judge()` below says so instead of printing a table with a winner
 * in bold.
 *
 * ## What is assumed, said out loud
 *
 * These are two proportions on the same rows, so the comparison is **paired** and
 * the correct test is McNemar's on the discordant pairs. The discordant counts
 * are not in the published file, so the unpaired calculation is used, which is
 * the conservative direction: pairing can only narrow an interval, never widen
 * it. Every figure that depends on that assumption carries it in its own name.
 *
 * A power figure quoted without its assumptions is the same failure this project
 * is about, one level up.
 */

/** Two-sided 95%, and 80% power. The conventional pair, named rather than inlined. */
export const Z95 = 1.959963984540054
export const Z80 = 0.8416212335729143

/** Wald half width on one proportion, in percentage points. */
export function halfWidth(pPercent, n) {
  const p = pPercent / 100
  return 100 * Z95 * Math.sqrt((p * (1 - p)) / n)
}

/**
 * The smallest difference this sample could detect, in percentage points.
 *
 * This is the number the refusal is built on, and the one an evaluation should
 * print beside its result whether or not anybody asked.
 */
export function minimumDetectable(pPercent, n) {
  const p = pPercent / 100
  return 100 * (Z95 + Z80) * Math.sqrt((2 * p * (1 - p)) / n)
}

/** Rows per arm needed to detect `dPercent`, unpaired. */
export function nNeeded(pPercent, dPercent) {
  const p = pPercent / 100
  const d = dPercent / 100
  if (d === 0) return null
  return Math.ceil((2 * p * (1 - p) * (Z95 + Z80) ** 2) / d ** 2)
}

/**
 * The paired requirement, across discordant rates, since the real one is almost
 * never recorded.
 *
 *   n = (z95*sqrt(pd) + z80*sqrt(pd - diff^2))^2 / diff^2
 */
export function nNeededPaired(dPercent, discordantPercent) {
  const diff = dPercent / 100
  const pd = discordantPercent / 100
  if (diff === 0 || pd <= diff * diff) return null
  return Math.ceil((Z95 * Math.sqrt(pd) + Z80 * Math.sqrt(pd - diff ** 2)) ** 2 / diff ** 2)
}

/**
 * McNemar's z across every discordant total consistent with the observed net
 * margin, because the total is the thing nobody writes down and the answer
 * depends on it entirely.
 */
export function mcnemarRange(netRows, n) {
  if (netRows === 0) return []
  return [netRows, 50, 100, 200, 500, 1000]
    .filter((t) => t >= netRows && t <= n)
    .map((discordant) => {
      const z = netRows / Math.sqrt(discordant)
      return { discordant, z: Number(z.toFixed(2)), significant: z > Z95 }
    })
}

/**
 * The product.
 *
 * Given two measured proportions on the same `n`, return what may honestly be
 * said about the difference. Three verdicts and no fourth:
 *
 *   `refused`      the difference is smaller than this sample can detect
 *   `different`    the difference clears the interval
 *   `indistinguishable`  it does not clear it, and the sample was large enough
 *                        that saying so is itself a result
 *
 * The third is the one that makes the first honest. A runner that answers
 * "refused" to everything has not measured anything either, and the difference
 * between "I cannot tell" and "these are the same to within a tenth of a point"
 * is the entire value of knowing your sample size.
 *
 * `rows` is first in every message on purpose. "5.3 rows out of 10,578" is
 * understood correctly by everybody who reads it; "-0.05pp" is understood
 * correctly by people who were going to get this right anyway.
 */
export function judge(aPercent, bPercent, n, { label = 'the difference' } = {}) {
  /*
   * The raw difference decides; the rounded one is reported. Both roundings in
   * this function were on the deciding path in its first version and
   * `check:refusal` caught them one after the other: the threshold was compared
   * at two decimal places, and then the difference itself was compared at four,
   * so a difference of exactly the detection limit came back refused twice for
   * two different reasons.
   *
   * A runner whose verdict turns on the precision of its own caption is deciding
   * on a label rather than on a measurement. That is the failure this project is
   * named after, occurring in the function written to catch it, which is either
   * the best argument for the gate or the worst look, and it is in the log
   * either way.
   */
  const exactDelta = Math.abs(bPercent - aPercent)
  const delta = Number((bPercent - aPercent).toFixed(4))
  const absDelta = Math.abs(delta)
  const rows = Number(((exactDelta / 100) * n).toFixed(1))

  /*
   * The threshold the decision is made on, and the one it is printed at, are
   * not the same number, and the first version of this used the printed one.
   *
   * `check:refusal` caught it on its first run: a difference of exactly the
   * minimum detectable effect, 1.677pp, was refused, because the comparison was
   * against 1.68 after rounding for display. A runner whose verdict turns on the
   * second decimal place of its own caption is deciding on a label rather than
   * on a measurement, which is the failure this project is named after, in the
   * function that is supposed to catch it.
   */
  const exactMde = minimumDetectable(aPercent, n)
  const mde = Number(exactMde.toFixed(2))
  const mdeRows = Math.round((exactMde / 100) * n)
  const ratio = exactDelta === 0 ? null : Number((exactMde / exactDelta).toFixed(1))

  const base = { label, a: aPercent, b: bPercent, n, delta, rows, mde, mdeRows, ratio }

  if (exactDelta === 0) {
    return {
      ...base,
      verdict: 'indistinguishable',
      why: `identical to the precision reported, on ${n.toLocaleString('en-US')} rows`,
      sayable: `no difference was measured. This sample would have caught one of ${mdeRows} rows or more.`,
    }
  }

  /*
   * Compared with a relative tolerance, because at the threshold itself the
   * verdict would otherwise turn on the last bit of a double.
   *
   * `check:refusal` walked this down: first the threshold was rounded to two
   * decimals, then the difference to four, and after both were fixed the exact
   * boundary case still failed, because `(a + mde) - a` is not `mde` in floating
   * point. A runner whose answer flips on one unit in the last place is not
   * wrong so much as meaningless there, and a reader given "refused" for a
   * difference of exactly the detection limit has been told something that is
   * not true of their data.
   *
   * 1e-12 relative is far below any precision an evaluation is reported at and
   * far above double noise at these magnitudes.
   */
  if (exactDelta >= exactMde * (1 - 1e-12)) {
    return {
      ...base,
      verdict: 'different',
      why: `${rows} rows, and this sample can detect ${mdeRows}`,
      sayable: `${label} is ${rows} rows of ${n.toLocaleString('en-US')}, which this sample can carry: it detects ${mdeRows} rows and above.`,
    }
  }

  return {
    ...base,
    verdict: 'refused',
    why: `${rows} rows, and this sample can only detect ${mdeRows}`,
    sayable:
      `${label} is ${rows} rows of ${n.toLocaleString('en-US')}. This sample detects ${mdeRows} rows and above, ` +
      `so the difference is ${ratio} times smaller than the smallest it could see. ` +
      `${nNeeded(aPercent, exactDelta)?.toLocaleString('en-US')} rows would be needed to call it either way.`,
  }
}
