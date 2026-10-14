---
name: prettydocument
description: Turn an existing document (markdown, report, notes, transcript, article, deck outline, paper) into a branded, standalone visual essay — a schema-validated document with chapters, sourced claims, and figures from a fixed component catalog — as one self-contained HTML page that carries the author's own logo and title. Use when asked to convert, adapt, or "make a visual essay / long-form explainer / data story / pretty document" out of something already written, or to brand one.
---

# Pretty document: a visual essay from a document

Convert a document somebody already wrote into a chaptered, figure-bearing,
source-grounded **visual essay**, published as one self-contained HTML page
that carries the author's own logo and title (or none).

You are not writing a web page. You are producing **validated content JSON**
that a bundled renderer draws. Everything about the visual language — type,
rules, motion, print behavior, accessibility — already exists in this skill and
is reused by every essay. Your job is editorial and structural: choose the
chapter architecture, write the prose, and cast each chapter's argument into a
figure from the skill's own component catalog.

Everything runs locally with Node 20+ and nothing else: no install step, no
network (except Google Fonts when a design system asks for fonts), no account.

## Where things are

- `<skill>` means the directory that contains this `SKILL.md`. Scripts are
  `node <skill>/scripts/<name>.mjs`. Never edit anything inside `<skill>`.
- Your **workspace** is the directory you run commands from (or
  `$PRETTYDOCUMENT_HOME`). It holds the user's own files: `drafts/`,
  `design-systems/`, `brand.config.json`, `out/`. Run from the folder the user
  is working in, not from `<skill>`.

## Non-negotiable rules

1. **Never write React, CSS, HTML, SVG, or a new component.** Output is JSON.
   If no catalog component fits a passage, write prose — do not invent a visual.
2. **Never invent facts, numbers, dates, or quotes.** Every claim traces to a
   chunk id produced by `ingest`. If the source does not say it, do not say it;
   where the source is silent, say so in prose ("the data does not measure…").
3. **Never flatten the source.** A conversion is not a summary. Carry the
   argument, the evidence, and the reservations across. Cutting is allowed;
   inventing is not.
4. **Never use a behavior-only component.** Interactive primitives (beeswarm,
   scrolly stepper, weight matrix, compare slider, …) are behaviors wired up by
   engineers, not document blocks. `references/casting-table.md` lists what you
   may select; `registry/authoring-registry.json` is the machine-readable list.
5. **Every figure needs a text equivalent.** `altText` describes the structure
   and the takeaway, not the picture. A figure without `altText` is a bug.
6. **Validate before you show anything.** `validate.mjs` must be clean
   (no errors; warnings explained) before preview or publish.
7. **Never put a colour, a font name, or CSS in a block.** How an essay looks is
   a *design system*: a validated set of colours and approved fonts, chosen in
   step 0. The baseline is the default. See `references/design-systems.md`.
8. **Never put a brand in a block, and never invent one.** The logo and title at
   the top of the page are the author's *brand*, set at publish time in step 0b.
   If the user gave none, the page has no masthead. Do not add a name, a logo or
   a link to a catalog, "home" or "all essays" page that was not asked for.

## What you produce

```text
drafts/<slug>/                  (in your workspace)
  source.md        normalized source text (from ingest)
  chunks.json      source chunks with stable ids — the evidence base
  structure.json   detected chapter boundaries
  plan.json        the narrative plan (you author this); records the design system
  blocks.json      the chapter blocks (you author this)
  document.json    PublicationDocument (compose writes this — never hand-edit)
  report.md        validation report
  preview/index.html   the page as it will publish
  export/<slug>.md     portable markdown paper
```

Publishing writes `out/<slug>/index.html` (one self-contained page),
`document.json` and the markdown paper.

## Workflow

Run every command from your workspace. `--draft` is the working directory;
use `drafts/<slug>`.

### 0. Choose the design system

An essay is drawn with the baseline design system unless the user wants
otherwise. Decide this before you write anything, in one of three ways:

- **The user gave nothing about look or brand** (the usual case): use the
  baseline. Do not ask. Mention in your final report that a design system can
  be chosen.
- **The user named a brand, gave colours or fonts, or shared brand guidelines:**
  read `references/design-systems.md`, then
  `node <skill>/scripts/design.mjs init …`. It validates
  everything through the bundled publication contract and refuses what fails. Pass
  `--design-system <id>` to compose in step 6.
- **The request is ambiguous ("make it nicer"):** ask one question: brand
  colours or fonts to use, or the default look?

`design.mjs list` shows what exists, including the `harbour` worked example.
`references/brand-guidelines.md` says what each colour and font role is for and
what a design system may not change.

### 0b. Choose the brand (logo and title)

The brand is the masthead at the top of the page: the author's logo and title,
and optionally a tagline, a link and a footer line. It is separate from the
design system (colours and fonts) and is applied when you preview or publish,
never stored in the document. **By default there is no masthead at all.**

- **The user named an organisation, gave a logo, or asked for it to be "branded":**
  set it once, in the workspace:

  ```bash
  node <skill>/scripts/brand.mjs init --title "Acme Research" --logo path/to/logo.svg \
       [--logo-alt "Acme"] [--tagline "…"] [--url https://acme.example] [--footer "© Acme 2026"]
  ```

  It checks everything and writes `brand.config.json`; every later `preview` and
  `publish` from that workspace carries it. A logo is a local `.svg`, `.png`,
  `.jpg` or `.webp` up to 256 KB. It is embedded in the page, so remote URLs are
  refused, and an SVG with script, event handlers or external references is
  refused rather than cleaned. A logo with no title needs `--logo-alt`.
- **One-off:** pass `--brand-title … --brand-logo …` to `preview` / `publish`
  instead, or `--no-brand` to ignore a saved brand for that run.
- **The user said nothing about branding:** publish unbranded. Do not ask, and
  do not borrow a name from the source document. Mention in your final report
  that a logo and title can be added.
- **Never fetch a logo from the web or generate one.** If the user has no file,
  say so and publish with a title only.

`brand.mjs show` prints what will be used; `brand.mjs clear` removes it.

### 1. Ingest

```bash
node <skill>/scripts/ingest.mjs \
  --source path/to/document.md --draft drafts/<slug>
```

Normalizes the text, detects chapter boundaries, and splits the source into
numbered chunks (`c01`, `c02`, …) that never cross a heading. Read
`structure.json` first: it tells you whether the document already has an
architecture.

### 2. Scaffold the plan

```bash
node <skill>/scripts/scaffold.mjs --draft drafts/<slug>
```

Writes `plan.json` (one chapter per detected section, thin ones merged toward the
5–12 range) and an empty `blocks.json`. Scaffold merges but never splits, so a
short source can land under five chapters: split a section in `plan.json` by
hand if the argument has more than the headings show, and record it in
`structureNotes`. Chapter ids and `sourceChunkIds` are
already correct; `centralThesis`, `narrativeArc`, and each chapter's `purpose`
and `thesis` are yours to write.

### 3. Author the plan

Fill `plan.json`. For each chapter:

- `title` — short, concrete, sentence case. Two or six words, not a label.
- `purpose` — one sentence: what this chapter does to the reader's understanding.
- `thesis` — one sentence: the arguable claim the chapter defends.
- `estimatedWords` — set from `purpose`, not from the chunk sizes.

Record structural decisions in `structureNotes`: what you merged, split, moved,
or dropped, and why. Headings in the source are the default boundaries — if you
change them, say so here.

**Do not write essay prose at this stage.** You are deciding what the essay is.

### 4. Cast the visuals

Read `references/casting-table.md`. For each chapter, decide one of:

- **a figure** — pick the component whose *semantic job* matches the chapter's
  move (see the casting table; do not pick by name similarity);
- **a chart** — only when the source contains a real table of numbers
  (`kind: "data"`); the numbers must be transcribed, not estimated;
- **a concept model** — when the chapter is a set of things and typed
  relationships between them;
- **nothing** — some chapters should be pure prose. Roughly one chapter in
  three may stay unillustrated.

Then check the essay for repetition: the same component more than three times
reads as a template, not an argument. `validate.mjs` will flag it.

If you know the chapter's question but not the figure, start from
`references/question-to-figure.md`.

Then read `references/layout-and-flow.md` and make three judgements before you
write a word of prose:

- **Cut.** Ask the four questions in section 1 of each figure. A figure that
  fails two is deleted now, not after it is written.
- **Place.** For each surviving figure, note in `plan.json → structureNotes`
  which paragraph it follows ("after the paragraph that names the four words").
  It goes after the paragraph that introduces its subject, not at the end.
- **Size.** Check the figure against the capacity table (stages, circles, items,
  label and detail length). If the source has more than a figure carries, pick
  a different figure or let the prose carry it; do not shrink the text.

### 5. Write the blocks

Fill `blocks.json` — see `references/block-contracts.md` for the exact shape.
Per chapter: 3–6 paragraphs of 40–110 words, the cast figure, and at most one
pullquote. Every block carries `source: ["c07"]` with the chunk ids it rests on.

**Order is layout.** Blocks render in the order you write them. Put the figure
after the paragraph that sets it up, and leave prose on both sides:

```text
weak     P P P P P P P F      prose, then a picture of the prose
strong   P P P F P P P P      set it up, show it, then argue from it
```

Never open a chapter on a figure, and do not let every chapter end on one.

Read `references/house-style.md` before writing the first paragraph. The short
version: concrete before abstract, one idea per paragraph, no meta-commentary
("in this essay…"), no invented numbers, no hedging stacks, no emoji.

When a paragraph makes a specific checkable claim, add it to `claims`:

```json
{ "kind": "paragraph", "text": "…", "claims": [{ "quote": "the exact words from the source", "source": ["c07"] }], "source": ["c07"] }
```

`compose` turns `quote` into a character range inside `text`; a quote that does
not appear verbatim in the paragraph is a validation error.

### 6. Compose

```bash
node <skill>/scripts/compose.mjs --draft drafts/<slug> --title "Title of the essay" [--design-system <id>]
```

Deterministically merges `plan.json` + `blocks.json` into `document.json`
(block ids, evidence references, claim ranges, visual language, word counts).
Never hand-edit `document.json` — fix the inputs and recompose.

`--design-system` embeds the chosen colours and fonts and records the choice in
`plan.json`, so a recompose keeps it; `--design-system fieldnotes-light` returns
to the baseline. An unknown or invalid design system stops compose.

### 7. Validate

```bash
node <skill>/scripts/validate.mjs --draft drafts/<slug>
```

Two gates in one report:

- **contract** — the publication contract's `validatePublicationDocument`,
  bundled in `vendor/`. Non-negotiable; a document that fails this will not
  render.
- **editorial lint** — structure, budgets, evidence coverage, figure policy,
  prose length. Errors block publishing; warnings need a reason.

Fix at the source: edit `plan.json` / `blocks.json`, recompose, revalidate.
Loop until clean.

### 8. Preview

```bash
node <skill>/scripts/preview.mjs --draft drafts/<slug>
```

Writes `preview/index.html` — one self-contained page with the brand and design
system applied, so what you review is what ships — plus `export/<slug>.md`. Open the HTML and read the essay end to end before
publishing. Check it at a narrow width too; the figures reflow.

With a design system chosen, the preview draws its colours and fonts too (the
fonts load from Google Fonts, so it needs a network connection to show them;
without one it falls back to system fonts).

The preview is the real page: the same renderer draws every figure and chart.
Judge layout there, using the checklist in section 6 of
`references/layout-and-flow.md`: text inside shapes, wrapping, rhythm, narrow
width.

### 9. Publish

```bash
node <skill>/scripts/publish.mjs --draft drafts/<slug> --slug <slug> [--out out]
```

Validates again, then writes `out/<slug>/`:

- `index.html` — the essay as one self-contained page. Open it, host it
  anywhere, or send it as an attachment. It runs no script.
- `document.json` — the validated document it was drawn from.
- `<slug>.md` — the portable markdown paper.

Pass `--format release` to also write `release.json`, the
`{ slug, revision, publishedAt, document }` envelope that FieldNotes Studio
imports, if the user has one. Otherwise do not mention it.

Tell the user where `out/<slug>/index.html` is and how it is branded.

## Reference map

| Read when | File |
| --- | --- |
| Choosing or building a design system (brand colours, fonts) | `references/design-systems.md` |
| Putting the author's logo and title on the page | step 0b above; `brand.config.example.json` |
| What each colour and font role is for; what may not change | `references/brand-guidelines.md` |
| Choosing a figure for a chapter | `references/casting-table.md` |
| Starting from the chapter's question, or an AI-systems topic | `references/question-to-figure.md` |
| Deciding where a figure goes, whether to keep it, and what it can hold | `references/layout-and-flow.md` |
| Writing blocks.json | `references/block-contracts.md` |
| Writing any prose | `references/house-style.md` |
| Before publishing | `references/review-gate.md` |
| Machine-readable catalog | `registry/authoring-registry.json` (a snapshot; `scripts/registry.mjs` summarizes it) |

## Failure modes to avoid

- **Catalog essay by name.** `swimlane` is not "the one with lanes"; it is for
  responsibility and handoff across actors. Pick the semantic job.
- **Figure per chapter, mechanically.** A figure that restates the paragraph
  above it is noise. Cast, then delete the ones that earn nothing.
- **Every figure at the end.** A chapter that is seven paragraphs and then a
  picture reads as prose with an appendix. Place the figure after the
  paragraph that introduces it.
- **Restyling inside the essay.** Colours and fonts belong to the design system,
  not to blocks. A request to "make this heading blue" is a design-system
  decision (or a no), never a block edit.
- **Shrinking text to fit.** If a figure cannot hold the source's content,
  the figure is wrong. Do not truncate the content to suit it.
- **Orphan chapters.** A chapter whose blocks cite chunks from another chapter
  means the plan is wrong; fix `plan.json`, not the citations.
- **Summary drift.** If the essay is shorter than half the source, you have
  summarized. Re-read `structure.json` and restore the argument.
- **Silently dropping sections.** Every detected section must end up in a
  chapter or be named in `structureNotes` as intentionally dropped (front
  matter, references, boilerplate).
