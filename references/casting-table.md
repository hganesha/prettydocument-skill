# Casting table: which figure a chapter earns

The reader already owns the visual language. You choose **one** of its figures
per chapter — the one whose semantic job matches the chapter's move. A figure
that merely decorates a chapter is worse than no figure.

## The ladder

Work down it and stop at the first honest answer.

1. **Nothing.** Chapters of argument, evidence, or consequence often read
   better as plain prose. Roughly one chapter in three should have no figure.
2. **A semantic figure** (`kind: "figure"`) — the chapter explains a structure:
   layers, a sequence, a handoff, a contrast, a set of regions.
3. **A data chart** (`kind: "data"`) — the chapter rests on numbers that exist
   in the source as a table. Transcribe them; never estimate, never
   interpolate, never invent a series.
4. **A concept model** (`kind: "model"`) — the chapter defines things and the
   typed relationships between them (a schema, an ontology, a vocabulary).
5. **A visual primitive** (`kind: "visual"`) — only `timeline`,
   `layered-stack` (variant `isometric-callouts`), or `semantic-infographic`.
   These are the only primitives with a shipped renderer; everything else in
   the primitive registry is `planned` and will fail validation.

## Semantic job → component

Pick by the job, not the name.

| The chapter's move | Cast | Why this one |
| --- | --- | --- |
| Layers that build on one another; abstraction levels; infrastructure strata | `layered-stack` / `architecture-stack` | Stacking is the argument: each layer enables the next. Not for chronology. |
| A process with real transformation between stages | `system-flow` or `pipeline-flow` | Stages must change the state, not just continue the list. |
| Ordered steps with no transformation (a method, a checklist) | `horizons` (`phases`) or `region-grid` | Sequence without causality is not a flow. |
| Who does what; responsibility and handoff across actors | `swimlane` | Lanes keep accountability visible; a flow would hide it. |
| Dated events on one axis | visual primitive `timeline` | Chronology with inflection points, not every event. |
| Before / after, old model against new | `comparison` (`before-after`, `old-new`) | Exactly two regions; pair each point with its counterpart. |
| Two competing forces with the subject between them | `comparison` (`tension`, `balance`) | Opposition is structural, not a list of pros and cons. |
| Two independent dimensions; clusters and outliers | `semantic-matrix` (`two-by-two`) | Axes must come from the argument, never generic high/low. Name all four regions. |
| Sorting claims or findings into named columns | `semantic-matrix` (`crosswalk-grid`) | 2–6 regions; use for evidence strength, not for two axes. |
| A set of named parts that belong to a whole (actors, activities, infrastructure) | `region-grid` (`pillars`) | Named regions each hold their own points. |
| Strengths / weaknesses / opportunities / threats | `region-grid` (`swot`) | Exactly four regions. |
| Now / next / later initiatives | `horizons` (`now-next-later`) | Order is sequence, not magnitude. |
| Repeated cards: findings, risks, uncertainties, people | `card-grid` (`cards`, `profiles`) | Identical frames; comparison by repetition. |
| A cycle where the output changes the next input | `feedback-loop` | Name what changes each turn. |
| Many inputs converging to one decision | `funnel` (`decision`, `convergence`) | The story is compression. |
| One source producing several outcomes | `branching-tree` | Divergence from a common origin. |
| Two vocabularies mapped onto each other (old name ↔ new name) | `crosswalk` or `translation-bridge` | A mapping, not a comparison. |
| A boundary that things cross, are transformed at, or are refused by | `boundary` (`membrane`, `human-gate`) | The perimeter is the point (APIs, approval, context limits). |
| Parts combining into a bounded whole | `assembly` | Compositional, not causal. |
| A spectrum with meaningful endpoints | `continuum` | Discrete categories do not belong on an axis. |
| Lifecycle or gates a record passes through | `state-track` (`lifecycle`, `evidence-gates`) | States in order, with the check between them. |
| A central capability with dependents around it | `orbital-system` (`hub-and-spoke`) | Genuine center/periphery; not a peer network. |
| Containment and scope | `nested-containment` | Things really contain one another. |
| Close reading of one primary artifact | `annotated-artifact` | One artifact, sparse sourced callouts. |
| A short definitional list, glossary, or spec | `editorial-table` or `accordion` | Text-first; a figure would inflate it. |
| Comparing named subjects across the same rows | `comparison-matrix` (`three-subject`) | Fixed subjects, matched rows. |
| Side-by-side fact columns, one per subject | `subject-profiles` | A verdict per column; never a ranking. |

Everything else: write prose. A chapter that resists all of the above is
usually a chapter that should be merged into a neighbour.

Casting says *which* figure. Where it goes in the chapter, how much it can
carry, and whether it should survive at all are in `layout-and-flow.md`.
When you know the chapter's *question* but not the figure, start from
`question-to-figure.md`, which also has recipes for AI-systems topics.

## Charts (`kind: "data"`)

Only when the source contains real numbers. The chart family answers a question
— pick by the question, and check the record limits in
`registry/authoring-registry.json`:

| Question | Family | First choice |
| --- | --- | --- |
| How do categories rank? | comparison | `bar-column`, `grouped-bar`, `dot-plot` |
| How does a value change over an ordered dimension? | trend | `line`, `multi-line`, `slope` |
| How are values spread? | distribution | `histogram`, `box-plot`, `heat-map` |
| What makes up the whole? | composition | `stacked-column`, `stacked-area`, `doughnut` |
| Do two variables move together? | relationship | `scatter`, `bubble` |
| How does a whole decompose? | hierarchy | `treemap`, `sunburst`, `circle-pack` |
| Where does volume move? | flow | `sankey` |
| What is connected to what? | network | `network`, `chord` |
| How much spread surrounds a value? | uncertainty | `box-plot` |
| What are the stages and decisions? | process | `waterfall`, `funnel`, `decision-tree` |

A chart block carries its own snapshot: `tables` (the transcribed rows) and
`roles` (which field plays which channel). The contract requires the roles the
chart marks require — `line` needs `period` and `value`; `grouped-bar` needs
`x`, `length`, and `hue`. Read `registry/authoring-registry.json` → `charts[] →
authoring` for the exact table shape and role ids per chart.

Two rules the house keeps: **a missing value is not zero** (leave it out and say
so in the caption), and **the caption must state what the data cannot show**.

## What you may not select

- **Behavior-only interactions** — `beeswarm`, `scrolly-stepper`,
  `effect-decomposer`, `cumulative-odds`, `weight-matrix`,
  `distribution-sampler`, `factor-calculator`, `glossary`, `raster-probe`,
  `phrase-binding`, `reveal-scrubber`, `compare-slider`, `tier-scorecard`,
  `release-ledger`, `scenario-comparison`, `decision-register`,
  `layer-switcher`, `view-switcher`, `classification-exercise`,
  `text-editing-exercise`, `revision-sequence`, `master-detail`,
  `rule-simulator`, `stepper`, `dialog`, `toast`. These are reader behaviors
  wired to supplied data by engineers. They are not document blocks.
- **Shell components** — `brand-mark`, `eyebrow`, `section-heading`,
  `contents-rail`, `mobile-reading-bar`, `catalog-card`, `figure-caption`,
  `closing-note`. The reader supplies these.
- **Planned primitives** — anything in `PRIMITIVES` whose `status` is not
  `enabled`. Validation rejects them; do not try to sneak one in as a
  `site-component`.
- **`prompt-response`** — author-placeable, but a recorded exchange. Only use it
  if the source contains the actual prompt and the actual reply.

## Repetition budget

- At most one figure per chapter; two only when the second is a chart that
  carries evidence the prose cannot.
- At most three uses of the same `componentId` in one essay, and never the same
  component in two consecutive chapters.
- `layered-stack` is recommended at most once per essay.

## Full catalog (generated)

The catalog snapshot is `registry/authoring-registry.json` (`node <skill>/scripts/registry.mjs` summarizes it).
"Readiness: extraction" means the component renders through its generic family
arrangement (flow, grid, stack, network, radial) rather than a purpose-built
renderer — it is safe, but visually plainer. Prefer the implemented ones.

| id | label | layer | readiness | variants | region rule |
| --- | --- | --- | --- | --- | --- |
| `accordion` | Accordion | editorial | implemented | — | no regions |
| `pullquote` | Pullquote | editorial | implemented | thesis, editorial-note | no regions |
| `margin-note` | Margin note | editorial | implemented | — | no regions |
| `editorial-table` | Editorial table | editorial | implemented | — | no regions |
| `code-card` | Code card | editorial | implemented | — | no regions |
| `chip-row` | Chip / code-token row | editorial | implemented | — | no regions |
| `annotated-artifact` | Annotated artifact | editorial | *extraction* | record-anatomy, sealed-run, package-specimen | optional 1-8 |
| `comparison-matrix` | Comparison matrix | editorial | implemented | three-subject | optional 1-8 |
| `equivalence-matrix` | Equivalence matrix | editorial | implemented | linked-entities | optional 1-8 |
| `subject-profiles` | Subject profiles | editorial | implemented | headline-figure, instrument-summary | optional 1-8 |
| `system-flow` | System flow | figure | implemented | estate-context, model-pipeline, generation-pipeline | optional 1-8 |
| `sequence-flow` | Sequence flow | figure | *extraction* | provenance-chain, handoff, operation-sequence | optional 1-8 |
| `feedback-loop` | Feedback loop | figure | *extraction* | — | optional 1-8 |
| `layered-stack` | Layered stack | figure | implemented | — | optional 1-8 |
| `architecture-stack` | Architecture stack | figure | implemented | vertical-tiers | optional 1-8 |
| `pipeline-flow` | Pipeline / flow | figure | *extraction* | — | optional 1-8 |
| `branching-tree` | Branching tree | figure | *extraction* | — | optional 1-8 |
| `node-edge-network` | Node-edge network | figure | *extraction* | — | optional 1-8 |
| `crosswalk` | Crosswalk | figure | *extraction* | — | optional 1-8 |
| `funnel` | Funnel | figure | *extraction* | decision, convergence, applicability | optional 1-8 |
| `bus` | Bus | figure | *extraction* | shared-capability-spine | optional 1-8 |
| `translation-bridge` | Translation bridge | figure | *extraction* | canonical-object | optional 1-8 |
| `continuum` | Continuum | figure | *extraction* | bounded-spectrum | optional 1-8 |
| `state-track` | State track | figure | *extraction* | lifecycle, evidence-gates | optional 1-8 |
| `orbital-system` | Orbital system | figure | *extraction* | hub-and-spoke, mutation-cases | optional 1-8 |
| `comparison` | Comparison | figure | implemented | before-after, old-new, tension, balance | required 2-2 |
| `semantic-matrix` | Semantic matrix | figure | implemented | two-by-two, crosswalk-grid | required; `two-by-two` exactly 4, `crosswalk-grid` 2-6 |
| `assembly` | Assembly | figure | *extraction* | blocks, factory, package | optional 1-8 |
| `semantic-equation` | Semantic equation | figure | *extraction* | value-equation | optional 1-8 |
| `curve` | Curve | figure | *extraction* | maturity, frontier | optional 1-8 |
| `staircase` | Staircase | figure | *extraction* | maturity-levels, price-staircase | optional 1-8 |
| `nested-containment` | Nested containment | figure | *extraction* | nested-loops, rings | optional 1-8 |
| `swimlane` | Swimlane | figure | implemented | agent-trace, handoff-trace | required 2-6 |
| `boundary` | Boundary | figure | *extraction* | membrane, human-gate | optional 1-8 |
| `region-grid` | Region grid | figure | implemented | pillars, brief, swot | required 2-6; `swot` exactly 4 |
| `horizons` | Horizons | figure | implemented | now-next-later, phases | required 2-5 |
| `card-grid` | Card grid | editorial | implemented | cards, profiles | no regions |

Limits: 12 items per figure (24 when regions are declared), 8 regions, region
labels ≤ 80 characters, `meta` annotations ≤ 40 characters, concept models ≤ 16
concepts / 12 properties each / 32 relationships / 4 columns. Glyphs come from
a fixed set of twelve: `person, document, data, process, globe, lock, spark,
flag, question, link, layers, compass`.
