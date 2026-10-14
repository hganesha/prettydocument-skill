# Visual guidelines: the baseline and design systems

What the baseline looks like, why, and the rules a design system must keep.
Voice and prose live in `house-style.md`; this is the visual half. Read it when
you choose a design system, and before you override anything.

The baseline is called `fieldnotes-light`. The values in the tables below are
**measured from the renderer**, not chosen: they are what a published essay
draws today. The "Rule" and "Used for" columns are guidance for authors.

## The character

An essay is a considered argument, so it looks like one: dark ink on
warm paper, a serif that carries long reading, small monospaced labels that
behave like marginalia, and almost no colour. Colour is rationed on purpose.
One quiet accent marks structure; one warmer colour marks the single thing the
reader should find first. Everything else is ink, grey and line.

The test for any visual decision: **would it still read if it were printed in
greyscale?** Colour may help the reader find things. It may never be the only
thing carrying meaning.

## Colour: seven roles

| Role | Baseline | Used for | Rule |
| --- | --- | --- | --- |
| `canvas` | `#f6f4ed` | The page. | Light and warm. Everything else is judged against it. |
| `surface` | `#eeebe2` | Figure and card backgrounds. | One step off the canvas, never a second brand colour. |
| `ink` | `#20221c` | Body text and headings. | The strongest contrast on the page. |
| `muted` | `#64675f` | Captions, details, axis labels. | Secondary information only. Never body text. |
| `line` | `#d8d5cb` | Rules, borders, dividers. | Decorative. It does not have to meet text contrast, but it has to be visible. |
| `accent` | `#686926` | Chapter labels, figure step numbers, meta annotations. | Small and structural. It labels; it does not shout. Never a paragraph colour. |
| `emphasis` | `#a14d36` | Focus rings, selection, and the first chart mark. | **One thing at a time.** If everything is emphasised, nothing is. |

The chart palette is six categorical colours, in order:
`#a14d36 · #6b775d · #a67c31 · #4a6273 · #806a82 · #777c70`.

- The first is the emphasis colour, so the headline series matches the focus ring.
- Categories are *names*, not rankings. Never let the order of hues imply
  better and worse; use a single-hue ramp (light to deep) when order matters.
- A diverging ramp meets at the page colour, so the midpoint reads as "no
  signal", not as a verdict.
- Colour never carries a status alone. A figure that uses red for "risk" also
  says "risk" in text or an icon.

## Type: four roles

| Role | Baseline | Used for |
| --- | --- | --- |
| `display` | System serif (Georgia) | Chapter and figure headings. |
| `body` | System serif (Georgia) | Running prose, 18px on a 1.7 line. |
| `ui` | System sans | Figure details, tables, tooltips, short annotations. |
| `mono` | System mono | Small uppercase labels, step numbers, figure meta. |

The page shell and the document title use the brand typefaces Instrument Serif,
DM Sans and IBM Plex Mono. The document body uses system fonts by default, so a
note reads without a download. A design system may choose approved fonts for
all four roles.

- **Display and body are structural.** Serif emphasis for headings is a rule of
  the system, not a decoration to vary per figure.
- **Mono is for labels, never for sentences.** It is set at 9 to 11px,
  uppercase, with letter-spacing. A long mono line is a code block, not a label.
- **Two or three families.** Four distinct fonts is almost always too many.

## What a design system may and may not change

**May change** (and nothing else): the seven colours, the six chart colours, and
the four fonts. Values are validated: colours are plain `#rrggbb`, fonts are ids
from the approved registry. A document cannot carry CSS, a font URL, or a
custom property.

**May not change**: layout, spacing, the type scale, figure components, motion,
print behaviour, or the page masthead. Those are the reading
experience (the masthead is the author's brand, set with `brand.mjs`, not a design-system choice). A design system recolours and re-types it; it does not redesign it.

## Contrast: what is enforced and what is advised

| Pair | Hard floor (document rejected below it) | Advised (warning) |
| --- | --- | --- |
| `ink` on `canvas` and on `surface` | 4.5:1 | |
| `muted` on `canvas` | 3:1 | 4.5:1 on canvas **and** surface |
| `accent` on `canvas` | 3:1 | 4.5:1 on canvas **and** surface |
| `emphasis` on `canvas` | 3:1 | |
| every chart colour on `canvas` | 3:1 | 3:1 on `surface` too |
| `line` against `canvas` | 1.1:1 (visible) | |

The reader sets muted and accent text at 9 to 14px, which is small text, so WCAG
AA asks for 4.5:1 there. The hard floors are lower than that on purpose, so a
brand with a mid-tone accent is not refused outright; it gets an advisory
instead. **The baseline meets the advised 4.5:1 everywhere**: muted and accent
text clear it on the canvas, the figure surface and the tinted bands, and every
chart colour clears 3:1 on the surface. `design.mjs show fieldnotes-light`
reports no advisories, and a test keeps it that way.

Small chart labels use a quiet grey that steps lighter than `muted` to keep a
hierarchy. It is derived so it never falls below 4.5:1 when `muted` clears it.

## Limits to know about

- **Fonts load from Google Fonts** (one request, a fixed host, taken from the
  registry and never from the document). System fonts need no request.
- **Dark canvases** work: every figure follows the canvas, including the
  layered-stack (its four tones, lighting and block labels are derived so the
  label reads at 4.5:1 on its face) and the choropleth ramps. Marks and labels
  are tuned on light canvases first, so read a dark essay in the preview before
  publishing it. The advisories say so.
- **The layered-stack figure** takes its ink, paper, gold rule, fonts and four
  tones from the design system. Its tones are the first four chart colours
  (terracotta, sage, ochre, slate map to chart colours 1 to 4).
- **The masthead is branding, not a design system.** The logo and title at the
  top come from `brand.mjs` (see `SKILL.md` step 0b) and are set at publish
  time. The design system only chooses the colours and fonts they sit in.

## Print

Every figure must still say its point without colour or interaction. Backgrounds
and tints are a convenience; the text equivalent is the figure. Do not choose a
palette where the only difference between two series is hue.
