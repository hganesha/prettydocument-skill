# Worked example: a deck blueprint → a visual essay

**Input** `source.md` — a 40-minute talk blueprint (normalized). 1,964 words, 15 slides, no argument written
in sentences: bullets, timings, speaker notes, and an aesthetic quickguide.

**Output** `document.json` — 8 chapters, 2,191 words, 6 figures, 2 pullquotes,
every block cited against 15 of the 20 source chunks. It passes
`validatePublicationDocument` and the editorial lint, and publishes to
`out/the-discernment-frame/index.html`.

## What to look at

| File | Why it is here |
| --- | --- |
| `structure.json` | 20 detected sections. The deck's own slides become the default chapter boundaries. |
| `plan.json` | How 20 slides became 8 chapters: the boilerplate that was dropped, the thin sections that were merged, and the author's own notes on top. |
| `blocks.json` | The authored surface. Note the `source` array on every block and the `claims` on the paragraphs that make checkable assertions. |
| `document.json` | What `compose.mjs` emits. Never hand-edit this file. |
| `report.md` | The validation report, warnings included. |
| `essay.md` | The portable markdown paper — the same essay without the page. |

## The decisions worth stealing

1. **Slide boundaries are not chapter boundaries.** A 91-word title slide cannot
   be a chapter. Each principle slide was merged with the demo that proves it, so
   every chapter keeps the deck's own idea → example → principle rhythm.
2. **Drop the scaffolding.** Speaker timings, the thank-you slide, the aesthetic
   quickguide, and the Q&A prompt exist to hold a room. They carry no argument,
   so they were dropped — and `plan.json → structureNotes` says so out loud.
3. **Cast by the job.** Six figures, six different components:
   `region-grid` (the four disciplines as regions), `system-flow` (one sentence
   through five representations), `comparison` (what the model supplies against
   what taste decides), `feedback-loop` (the refinement loop),
   `semantic-matrix` (one confident paragraph sorted by certainty), and
   `architecture-stack` (the four as layers). No component repeats, and two
   chapters are deliberately left unillustrated.
4. **Figures land where the argument needs them, not at the end.** Each figure
   follows the paragraph that introduces its subject: the four-word grid right
   after "Four words cover it", the loop right after "The process runs
   generate, inspect, test, learn, discard, regenerate", the sorted paragraph
   right after the paragraph that pulls it apart. Chapters therefore have
   different shapes (`PPPPFPPPP`, `PPFPPPPQP`, `PPPPPPFP`) instead of seven
   paragraphs and a picture. Two chapters stay pure prose. See
   `references/layout-and-flow.md`.
5. **Bullets became sentences, and the essay grew.** 1,964 words in, 2,191 out.
   The ratio matters: a conversion that comes out much shorter than its source
   is a summary, and the lint fails it.
6. **Two warnings were kept, with reasons.** `feedback-loop` has no purpose-built
   renderer yet, so it draws through the generic family arrangement. And the
   `system-flow` carries five stages where the reader fits four to a row, so the
   fifth wraps. The source's demo really does push one sentence through five
   forms; cutting one to tidy the row would change the argument. The report says
   so rather than hiding it — that is what a warning is for, and it is why the
   layout rules are warnings, not errors.

## Reproduce it

```bash
# from any empty working folder; <skill> is where the skill is installed
node <skill>/scripts/ingest.mjs --source <skill>/examples/discernment-frame/source.md --draft drafts/discernment-frame
node <skill>/scripts/scaffold.mjs --draft drafts/discernment-frame
# author plan.json and blocks.json — or copy the ones in this directory
node <skill>/scripts/compose.mjs --draft drafts/discernment-frame --title "The discernment frame"
node <skill>/scripts/validate.mjs --draft drafts/discernment-frame
node <skill>/scripts/preview.mjs  --draft drafts/discernment-frame
node <skill>/scripts/publish.mjs  --draft drafts/discernment-frame --slug the-discernment-frame \
  --brand-title "Your name" --brand-logo path/to/logo.svg
```
