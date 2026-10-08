# The audits

Commit messages cite identifiers like `ECAP-F1`. This is what they refer to.

No audit pass has been run against this project yet. Every finding here was
raised by a sweep of a class found in another project in the same workspace,
which is why the identifiers read `ECAP` and `EGRP` rather than a perspective.

**11 findings, 7 closed, 4 open**, across the 0 perspectives that produced them.

Held to the workspace queue this project is built from by
`tools/check-audit-status.mjs`, which fails if a row here says anything the
queue does not.

## `self`, swept from elsewhere (not an audit pass)

Not a perspective and not an agent. Findings raised against this project while
a class found somewhere else in the workspace was being swept across all eight,
kept here because commit messages cite them like any other.

11 findings, 7 closed.

| id | severity | status | finding |
|---|---|---|---|
| `ECAP-F1` | medium | fixed, tick 226 | capture.mjs hands the committed GIF to ffmpeg and closes its browser outside a finally |
| `EGRP-F1` | medium | fixed, tick 182 | serve.mjs kills a process group the spawn never creates, so cleanup off Windows leaves the server running |
| `EHEAD-F1` | medium | fixed, tick 224 | The h1 ships empty and is written by script, so a slow or blocked load has no headline at all |
| `EPOS-F1` | medium | fixed, tick 146 | The headline metric is rows[0] in the page and in all four gates, so a reorder moves both together |
| `EVLIC-F1` | medium | fixed, tick 118 | The README claims MIT and the repository carries no LICENSE file and no gate holding the claim |
| `EGIF-F1` | low | open | The loop runs ten seconds, which is the whole of a recruiter’s attention |
| `EPRE-F1` | low | fixed, tick 165 | npm run verify started a server and handed the same missing browser to every gate in turn |
| `ESIZE-F1` | low | open | The README states a file size that nothing measures, correct today at 10 KB |
| `ETAP-F1` | low | open | Controls shorter than 24 pixels at a phone width |
| `EFF-F1` | low | fixed, tick 226 | npm run capture resolves ffmpeg off PATH and asks for it only after the browser has launched |
| `EHEAD-F2` | low | open | The headline in index.html is held against the build and against nothing else |
