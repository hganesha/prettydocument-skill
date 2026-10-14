# Review gate: before you publish

Run `validate.mjs` first — it catches the mechanical failures. This checklist
catches the editorial ones. Every question needs a yes before you publish; a
no means go back to `plan.json` or `blocks.json`.

## Fidelity

- [ ] Does the essay still make every argument the source makes?
- [ ] Is every number in the essay traceable to a chunk, with its unit?
- [ ] Did any reservation, caveat, or limitation in the source survive?
- [ ] Are quotes verbatim? (Not paraphrased inside quotation marks.)
- [ ] Is authorship clear — is it obvious which claims are the source's and
      which are yours?
- [ ] Did the title come from the argument, not from the filename?

## Structure

- [ ] 5–12 chapters, each one doing a distinct job.
- [ ] Could two adjacent chapters merge without loss? If yes, merge them.
- [ ] Does each chapter's `thesis` state something the previous chapter has
      not yet established?
- [ ] Is the opening concrete and the closing a return, not a summary?
- [ ] Does `structureNotes` record every merge, split, and dropped section?

## Casting

- [ ] Does every figure earn its place — would the chapter be weaker without it?
- [ ] Is any component used more than three times?
- [ ] Are any two consecutive chapters illustrated by the same component?
- [ ] Does every figure have `altText` that states the structure and the takeaway?
- [ ] Does every chart caption say what the data cannot show?
- [ ] Is every figure item's `detail` supportable from its cited chunks?

## Design system

- [ ] Is the design system a deliberate choice: the baseline because nothing
      asked for more, or a brand because the user supplied one?
- [ ] Did `design.mjs show <id>` come back valid, and can you state every
      remaining advisory in one sentence?
- [ ] Were font substitutions (a brand font replaced by the closest approved
      one) and any colour you darkened for contrast reported to the user?
- [ ] Is there any colour, font name or CSS in `blocks.json`? There must not be.
- [ ] If the canvas is dark, did you read the essay in the preview, including any
      layered-stack and chart? They follow the canvas, but are tuned on light ones first.

## Layout and flow

Read `references/layout-and-flow.md` for the reasoning behind each.

- [ ] Does each figure sit right after the paragraph that introduces it, rather
      than closing its chapter by default?
- [ ] Does any chapter open on a figure, or put two figures (or a figure and a
      pullquote) directly together?
- [ ] Is there a stretch of roughly 350 words with nothing to look at?
- [ ] Do the chapters have different shapes, or is every one the same pattern?
- [ ] Would the essay lose anything if each figure were deleted? (Two noes to
      "does it do work the prose cannot?" means cut it.)
- [ ] Did you look at every figure **in the browser**, not only in the report:
      text inside its shape, no orphan card, no arrow pointing at nothing?

## Prose

- [ ] Read the whole essay aloud. Does any sentence need two reads?
- [ ] Any paragraph over 110 words? Any over 150?
- [ ] Any "in this essay", "it's important to note", "furthermore"?
- [ ] Any number without a unit or a comparison?
- [ ] Any claim the reader could not check?

## Mechanical

- [ ] `validate.mjs` reports zero errors.
- [ ] Every warning has a reason you can state in one sentence.
- [ ] Every chunk is either cited or named in `structureNotes` as dropped.
- [ ] `preview/index.html` opened and read end to end at desktop width and at
      about 375px wide.
- [ ] Print preview: does every figure survive? (No figure may be interactive-only.)
- [ ] The markdown export reads correctly on its own.
- [ ] The masthead shows the brand the author asked for, or nothing if they asked
      for none (`brand.mjs show`). Never a name or logo they did not choose.

## Only then

```bash
node <skill>/scripts/publish.mjs --draft drafts/<slug> --slug <slug>
# then open out/<slug>/index.html
```
