# Layout and flow: where a figure goes, and whether it should

Casting decides *which* figure a chapter earns. This file is about the other
half: **where it lands, how much it carries, and when to cut it.** The lint
catches the mechanical failures; the rest is judgement, and this is how to
make it.

## 1. Does it earn a place? Four questions

Ask them of every figure after you have cast it. Two noes: cut it.

1. **Does it do work the prose cannot?** A figure that restates the paragraph
   beside it is decoration. A figure earns its place by showing a structure
   (layers, a loop, a contrast, a sorting) that would take a page to say.
2. **Could one sentence replace it?** If the figure's takeaway fits in the
   `altText`, and the reader loses nothing by reading that sentence instead,
   write the sentence.
3. **Would the reader look back at it?** A figure the reader consults while
   reading on (a taxonomy, a loop, a four-part model) is worth its height. A
   figure they glance at once and scroll past is not.
4. **Does the prose after it use it?** The best figures are *referred to*: the
   next paragraph names an item in it, or tests it against an example.

Aim for roughly one chapter in three with no figure. A figureless chapter that
argues well is stronger than a chapter with a figure bolted on.

## 2. Where it goes inside a chapter

**Put the figure right after the paragraph that introduces its subject, not at
the end of the chapter.**

```
weak     P P P P P P P  F          prose, then a picture of the prose
strong   P P P  F  P P P P          set it up, show it, then work with it
```

- **Set up, show, use.** One paragraph names the thing ("Four words cover
  it…"). The figure shows it. The following paragraphs argue from it. That
  order is why the reader looks at the figure at all: they already want it.
- **Never first.** A chapter opens on a sentence, not a figure. The reader needs
  one paragraph of reason before they spend attention on a picture.
- **Rarely last.** A figure that closes a chapter must be the chapter's
  conclusion in picture form: the loop drawn after the argument that the
  process loops. Otherwise it is an appendix. If three or more chapters end on
  their figure, the essay has a template, and the lint says so.
- **A demo gets its figure after it is described.** When the source walks
  through a demonstration, the paragraph that describes it comes first and the
  figure shows what the demonstration produced.
- **A chart follows the claim it supports, and is read after.** Claim → chart →
  one paragraph saying what the shape means and, in the caption, what it
  cannot show.
- **Leave prose on both sides.** A figure directly against another figure or a
  pullquote loses the breathing room that makes either readable. Put a
  paragraph between them.
- **Pullquotes sit at a turn**, where the argument changes direction, and
  quote a line that the chapter has earned. Not in the first two paragraphs.
  Not the first thing after a figure.

## 3. Pacing across the essay

- **Vary the shape.** If every chapter is seven paragraphs and a figure in the
  same slot, the reader stops looking. Let one chapter be four paragraphs and a
  chart, another be pure argument, another turn on a pullquote.
- **No figure deserts.** Three chapters in a row without a figure means the
  essay has gone abstract. Cast one, or merge the chapters.
- **No more than about 350 words of prose in a row** with nothing to look at.
  Break it with the figure, a pullquote, or a chapter boundary. Shorter is
  fine; this is a ceiling, not a target.
- **The opening is concrete.** Give it a figure only when the source opens on
  one (an artifact, a diagram everyone has seen). Do not lead with a model.
- **The closing returns.** It usually wants no figure: it is the place the
  prose gets the last word.
- **Spend the heavy figures once.** `layered-stack`, a full `region-grid`, any
  figure with eight items: one per essay. Reuse is cheaper with small figures.

## 4. What a figure can carry

The reader lays figures out at a 760px column. These limits come from its CSS
and are checked by `validate.mjs` — design to them rather than discovering
them.

| Layout | Fits | Past that |
| --- | --- | --- |
| Flow (`system-flow`, `sequence-flow`, `pipeline-flow`, `funnel`) | 4 stages | Stage 5 wraps to a second row and the arrow above it points at nothing. Merge stages. |
| Radial (`feedback-loop`, `orbital-system`, `nested-containment`) | 3–6 items; label ≤ 24 chars, detail ≤ 60 | Text spills out of the circle. Cut the detail to the clause the figure needs. |
| Region grid / matrix columns | 2–3 regions per row; 4 lay out as 2×2; 6 as 3×2 | 5 wraps 3 + 2, which reads as uneven. Prefer 4 or 6 when the argument allows. |
| Any list figure | label ≤ 40 chars, detail ≤ 140 | It reads as a paragraph in a box. Move the sentence into the prose. |
| Charts | The record limits in `registry/authoring-registry.json` | Past the limit the contract rejects it. Short of it, ask whether the reader can still compare marks; if not, chart a subset and say so in the caption. |

When the source has more than a figure can carry, do not shrink the text. Pick
the figure's real job (see the casting table) and let the prose carry the rest.
If the source really does have five stages, keep five and accept the lint
warning, and say why in `structureNotes`. Fidelity to the source wins over a
tidy row.

## 5. Text in figures

- **Labels are noun phrases**, two to four words. "Study before you make", not
  "You should study before you make something".
- **Detail is the one clause the figure needs.** Not the sentence from the
  paragraph, copied. If the detail repeats the prose, the figure is redundant.
- **Meta annotations are a single word or number**, not a second label.
- **`title` names what the figure shows**, not the chapter's title again.
- **`altText` is two things: the structure and the takeaway.** "A four-step loop
  — generate, inspect, test, regenerate — with intent carried around it."

## 6. Look at the page

`preview/index.html` is the page that will publish, drawn by the same renderer,
so judge layout there. Open it in a browser, then check each figure for:

- **Alignment.** Text inside shapes (circles, cards) is centred and stays inside
  them. No label spills over an edge.
- **Wrapping.** No orphan card on its own row; no arrow pointing at empty space.
- **Rhythm.** Scroll the chapter at normal speed. Does the figure arrive when
  you want it? Is there a long unbroken stretch?
- **Narrow width.** Resize to about 375px. Figures reflow or scroll; nothing
  crops, nothing overflows the page.
- **Print.** Every figure still says its point without hover or interaction.

If a figure looks wrong and the content is within the limits above, the defect
is in the renderer, not the essay. Report it with the figure's JSON; do not
distort the essay to hide it.
