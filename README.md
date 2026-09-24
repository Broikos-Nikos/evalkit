# evalkit

### This evaluation can tell 178 rows apart. It was asked about 5.3.

A published comparison of two models on **10,578 held out sentences**. Its
headline metric moved by 5.3 rows. The smallest difference a sample that size
can detect is 178.

![An instrument. A bar sits far short of a marked threshold line and the verdict underneath reads refused. A hand drags the bar past the line, the verdict turns over to a real difference, and then drags it back to where it started, which is where the published evaluation actually sits](docs/evalkit.gif)

That is the real page in a real browser, recorded by `npm run capture`. It ends
where it begins, at the difference that was actually published, because that is
the one that cannot be called.

---

## The evaluation, judged

| metric | measured | difference | verdict |
|---|---|---|---|
| intent accuracy | 74.58 to 74.53 | 5.3 | refused |
| tag accuracy | 97.28 to 97.28 | 0 | indistinguishable |
| exact match | 69.97 to 69.86 | 11.6 | refused |
| intent accuracy, allowed to decline | 72.48 to 72.63 | 15.9 | refused |

**3 of 4 are refused.** The fourth is identical to the precision reported,
which is a result rather than a shrug: this sample would have caught a difference
of 178 rows and did not find one.

**The four point in different directions.** int8 is worse on intent accuracy and
exact match and *better* once allowed to decline. A quantisation that genuinely
degraded the model would not improve one of its four numbers.

**Every difference is stated in rows first.** "5.3 rows of 10,578" is read
correctly by everybody. "0.05pp" is read correctly by people who were going to get
this right anyway.

## What a refusal says

Not "no". A refusal that does not say what would have been enough is a shrug:

> intent accuracy is 5.3 rows of 10,578. This sample detects 178 rows and above, so the difference is 33.5 times smaller than the smallest it could see. 11,904,074 rows would be needed to call it either way.

## What this does not claim

**Not that the int8 graph is worse, or better.** The published numbers cannot
tell, and neither can this. A reader who comes away believing quantisation hurt
this model has made the same mistake in the opposite direction.

**Not that 10,578 is a small evaluation.** It is a good sample for "is this model
about 74% accurate", where it gives plus or minus 0.83pp. It is not a sample for
"is this version 0.05pp different from that one". The sample size that answers one
question is not the sample size that answers another, and that is the whole idea.

**Not that the arithmetic is the last word.** These are two proportions on the
same sentences, so the comparison is paired and the correct test is McNemar's on
the discordant pairs. Those counts were never recorded, so the conservative
unpaired calculation is used and says so everywhere it appears. Pairing can only
narrow an interval, so this is an upper bound on what is needed:

| if the two runs disagree on | sentences needed |
|---|---|
| 0.5% | 156,976 |
| 1% | 313,953 |
| 2% | 627,909 |
| 5% | 1,569,774 |
| 10% | 3,139,550 |

Even at 0.5% discordance the paired test needs 156,976 sentences, 15 times
what was used.

## The input

`data/meta.json`, 10 KB, committed, with its sha256 and the date it was frozen.
It is the author's own published evaluation rather than somebody else's, because
the same arithmetic applied to a stranger's work would be the same demonstration
with less standing behind it.

It is committed because this repository quotes it by number, and a quotation of a
file that has changed is a claim about a document nobody else has. `check:input`
fails if it ever records its discordant counts, because then the comparison can
be judged after all and the argument has been answered rather than won.

## Run it

```bash
npm install
npm run dev         # then open the address it prints
npm run build       # typecheck, four file gates, then the bundle
npm run verify      # the browser gates against one shared server
```

## The gates

| gate | what it stops |
|---|---|
| `check:refusal` | a runner that refuses everything, or nothing, or at the wrong place |
| `check:power` | a figure drifting from the evaluation it was computed from |
| `check:input` | the evaluation being edited under the figures |
| `check:page` | the page stating a number, or turning over, where the library does not |
| `check:capture` | the picture above becoming a photograph of a page that no longer exists |

`check:refusal` is the one this project exists to have, and it tests both
directions. The shipped evaluation produces no `different` verdict at all, so a
runner that returned `refused` unconditionally would pass every other gate here.
Its control does exactly that:

```
FAIL 3 of 6 boundary cases came back with the wrong verdict
FAIL judge() returned only 2 distinct verdicts across the whole range
ok   all 4 committed verdicts are what judge() returns today
```

That last line is why the boundary is probed rather than the committed values
compared: they still matched, because they are recomputed by the same broken
function.

Every gate here was written with its failure reproduced first.

## Licence

MIT for the code. The evaluation in `data/` is from `watch-it-think`, MIT, in
this same workspace.
