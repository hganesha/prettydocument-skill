# Choosing and building a design system

A design system is the colours and fonts an essay is drawn with. The baseline
(`fieldnotes-light`, the id the contract gives it) is the default and needs no choosing. This file is for the
moment someone wants something else: a brand, a client's palette, a house font.

Read `brand-guidelines.md` first for what the roles mean and what a design
system may not touch.

## When to choose one

Choose a design system when the user:

- names a brand, client, or product the essay is for ("make this look like Acme");
- gives colours or fonts (hex codes, a palette, "we use Inter and a dark blue");
- supplies brand guidelines or a style document;
- asks for a "different look", dark mode, or print-friendly colours.

Otherwise **use the baseline and do not ask**. Do not interrogate someone who
only wanted their document converted. Mention once, in your final report, that
a design system can be chosen.

If the request is ambiguous ("make it look nicer"), ask **one** question: do
they have brand colours or fonts to use, or should it stay on the
default look?

## The workflow

```bash
node <skill>/scripts/design.mjs list
node <skill>/scripts/design.mjs fonts --role body
node <skill>/scripts/design.mjs init --id acme --label "Acme" \
  --canvas '#fbfaf7' --ink '#14202b' --accent '#1d5c7a' --emphasis '#b2412e' \
  --font-body source-serif-4 --font-ui inter
node <skill>/scripts/compose.mjs --draft drafts/<slug> --title "…" --design-system acme
```

- `list` shows the baseline, the worked examples shipped with the skill
  (`harbour`), and anything in `design-systems/` in your workspace.
- `init` starts from the baseline (or `--from <id>`), applies your overrides,
  **derives what a brand does not supply**, **validates** everything through the
  publication contract, and writes `design-systems/<id>.json`. If
  anything is invalid it writes nothing, says why, and suggests the nearest
  value of the same hue that passes.
  - Change the canvas or ink and the **surface, muted text and rule colours are
    derived** from them, so they sit on your page instead of the baseline's greys.
    Pass them to override.
  - Change any colour without `--chart` and a six-colour palette is derived.
  - Give `--font-body` and no `--font-display`, and headings follow the body font.
- `show <id>` prints the contrast table, the chart palette and the fonts it
  will load. Read it before you compose.
- `compose --design-system <id>` embeds the validated tokens in the document and
  records the choice in `plan.json`, so a recompose keeps it. `--design-system
  fieldnotes-light` returns to the baseline.

`compose` validates the chosen file again, so a bad palette cannot reach a page.

## Turning a brand into tokens

Work in this order. Each step constrains the next.

1. **`canvas` and `ink` first.** Take the brand's page colour and its text
   colour. If they are below 4.5:1, the brand has an accessibility problem;
   darken the ink, do not lighten the canvas. Pure white and pure black are
   allowed but read harsher than the baseline's warm pair.
2. **`surface`.** One small step off the canvas, a few percent toward the ink.
   It is not a second brand colour.
3. **`accent`.** The brand's primary. It labels structure at 9 to 14px, so aim
   for 4.5:1 on both canvas and surface. If the brand colour falls short,
   darken it until it clears; say so.
4. **`emphasis`.** The brand's secondary or alert colour, the one that should
   draw the eye. It leads the chart palette, so choose something distinct from
   the accent.
5. **`muted`.** A mid-tone of the ink, not a third hue. Aim for 4.5:1 on canvas
   and surface.
6. **`line`.** Just visible against the canvas, lighter than muted.
7. **`chart`.** Leave it out and `init` derives six legible colours from the
   emphasis. Supply your own only when the brand has a categorical palette, and
   keep the first the emphasis colour. Every colour needs 3:1 on the canvas.

Then fonts (below). Then run `show`, fix every advisory you can, and report the
ones you cannot.

## Fonts: mapping a brand font to the registry

Fonts are ids from a fixed list (`design.mjs fonts`). A document cannot name a
font or load one from a URL. When the brand's font is not on the list, pick the
**closest approved font and tell the user it is a substitute.** Do not claim a
match.

| Brand font | Closest approved | Exact? |
| --- | --- | --- |
| Georgia | `system-serif` | exact |
| Playfair Display, Merriweather, Lora, Fraunces, Newsreader, Source Serif, IBM Plex (Serif, Sans, Mono), DM Sans, Inter, Work Sans, JetBrains Mono, Instrument Serif | the same id | exact |
| Garamond | `eb-garamond` | close: a Garamond revival, not Adobe or Monotype Garamond |
| Times, Baskerville, Caslon, Minion | `newsreader` or `source-serif-4` | substitute |
| Helvetica, Arial, Segoe UI, SF Pro, Roboto, Open Sans, Lato, Calibri | `inter` (or `system-sans` for no download) | substitute |
| Futura, Avenir, Gotham, Proxima Nova | `dm-sans` or `work-sans` | substitute |
| Courier | `courier-prime` | close: a Courier-style slab mono |
| Menlo, Consolas, Fira Code, Source Code Pro | `system-mono` or `jetbrains-mono` | substitute |

If the user needs the exact font, say so: it is not in the approved
registry, and the registry is fixed by the publication contract this skill
ships with. Say so, use the closest approved font, and do not work around it.

Role fit is enforced. A display-only face (`instrument-serif`,
`playfair-display`) cannot be the body font; a monospace face can only be
`mono`.

## What to tell the user

After composing, say in two or three lines:

- which design system the essay uses, and that it is validated;
- any substitution you made (a font, or a colour you darkened for contrast);
- the advisories that remain, in plain words;
- that its fonts load from Google Fonts, if they do.

## What not to do

- **Never put a hex value, a font name, or CSS in `blocks.json`.** The only way
  to change colour or type is a design system.
- **Never edit `document.json`** to add a theme. Use `--design-system`.
- **Never lower a contrast failure by changing the canvas** to hide a weak
  accent. Fix the colour that fails.
- **Do not publish a dark theme without opening the preview.** Every figure
  follows a dark canvas, but marks and labels are tuned on light ones first.
- **Do not create a design system to "tweak" the baseline slightly.** If
  nothing in the brief asks for a different look, stay on the baseline.
