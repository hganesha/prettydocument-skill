# blocks.json: the authoring contract

`blocks.json` is the surface you write. `compose.mjs` turns it into a
`PublicationDocument`, filling in what is deterministic (block ids, evidence
references, claim ranges, visual language) so you only author the editorial
part. Field names here are deliberately simpler than the published contract.

```json
{
  "chapters": [
    {
      "id": "why-now",
      "subtitle": "Optional one-line deck under the chapter title.",
      "blocks": [ /* ordered blocks, see below */ ]
    }
  ]
}
```

`id` must match a chapter id in `plan.json`. Omitting a chapter is an error;
omitting `subtitle` is fine.

Every block accepts `source: ["c07", "c08"]` — the chunk ids it rests on.
Paragraphs take `source` for the whole paragraph and `claims` for individual
checkable assertions.

---

## paragraph

```json
{
  "kind": "paragraph",
  "text": "A finished result carries no record of its own difficulty. What looks like a single step was seven, and the six that failed left nothing behind.",
  "claims": [
    { "quote": "seven", "source": ["c04"] }
  ],
  "source": ["c04"]
}
```

- `text` — 40–110 words. One idea. No markdown: plain prose only.
- `claims` — optional. `quote` must appear **verbatim** inside `text`;
  `compose` converts it to `{start, end}` offsets. A quote that is not in the
  paragraph is a validation error.
- Put claims only on sentences that make a specific, checkable assertion.

## pullquote

```json
{ "kind": "pullquote", "quote": "We are trying to describe a new kind of machine with diagrams invented for the old one.", "attribution": "Chapter 1", "source": ["c02"] }
```

At most two per essay. A pullquote is a rhetorical pause, not a summary of the
paragraph above it. `attribution` is optional and should be a person, document,
or section — never "the author".

## figure

```json
{
  "kind": "figure",
  "componentId": "swimlane",
  "variant": "handoff-trace",
  "title": "Who does what, and where the work is handed off",
  "altText": "A swimlane showing four steps handed between a person, an agent, and a system.",
  "groups": ["Person", "Agent", "System"],
  "items": [
    { "label": "Starts the request", "detail": "The trigger that opens the case.", "group": 0, "meta": "Step 1", "icon": "person" },
    { "label": "Gathers context", "detail": "What is collected, and from where.", "group": 1, "meta": "Step 2", "icon": "process" },
    { "label": "Records the outcome", "detail": "The durable record that survives the run.", "group": 2, "meta": "Step 3", "icon": "data" },
    { "label": "Approves or returns", "detail": "The human decision point.", "group": 0, "meta": "Step 4", "icon": "lock" }
  ],
  "source": ["c05", "c06"]
}
```

- `componentId` — from the casting table. `variant` must be one the component
  declares (omit it when the component has none).
- `groups` — required when the component's region rule says **required**
  (`comparison`, `semantic-matrix`, `swimlane`, `region-grid`, `horizons`).
  Respect the per-variant counts: `two-by-two` is exactly four, `swot` exactly
  four, `comparison` exactly two.
- `items` — 1–12 (24 with regions). `label` is a noun phrase, not a sentence;
  `detail` is one sentence of sourced explanation. `group` indexes `groups`.
- `meta` — a short mono annotation (≤ 40 characters): a status, measure, step,
  or role. Not a second label.
- `icon` — one of twelve glyphs. Use one or none; do not decorate every item.
- `altText` — one sentence naming the structure **and** the takeaway.
- Every item's `detail` must be supportable from the cited chunks.

## data

```json
{
  "kind": "data",
  "chart": "multi-line",
  "title": "Cost per million tokens, by model tier",
  "deck": "List price, USD. Three tiers, quarterly.",
  "caption": "List price only; it excludes committed-use discounts and ignores the volume shift the next chapter measures.",
  "altText": "Three descending lines: every tier falls by roughly two orders of magnitude between 2023 and 2026.",
  "tables": {
    "data": {
      "fields": [
        { "name": "period", "type": "temporal", "label": "Quarter" },
        { "name": "tier", "type": "nominal", "label": "Tier" },
        { "name": "price", "type": "quantitative", "label": "USD per million tokens" }
      ],
      "rows": [
        { "period": "2023-01", "tier": "Frontier", "price": 30 },
        { "period": "2026-01", "tier": "Frontier", "price": 2.5 }
      ]
    }
  },
  "roles": { "period": "period", "hue": "tier", "value": "price" },
  "source": ["c11"]
}
```

- `chart` — a chart id from the registry. `roles` maps **chart channel → table
  field**; the required channels are in the registry (`charts[] → required`).
- Transcribe numbers exactly. A missing cell is left out, never zeroed.
- `caption` must say what the data cannot show.
- The snapshot (tables + roles) is hashed and published with the document; only
  fields a chart actually uses may appear.

## model

```json
{
  "kind": "model",
  "title": "The record and what it carries",
  "altText": "Four concepts — case, evidence, decision, and review — with typed relationships between them.",
  "concepts": [
    { "id": "case", "label": "Case", "domain": "Work", "detail": "One subject's file.", "column": 0,
      "properties": [
        { "id": "case-id", "label": "Case ID", "valueType": "text", "identifier": true, "required": true },
        { "id": "opened", "label": "Opened", "valueType": "date" }
      ] },
    { "id": "evidence", "label": "Evidence", "domain": "Work", "detail": "What the case rests on.", "column": 1,
      "properties": [ { "id": "source", "label": "Source", "valueType": "reference" } ] }
  ],
  "relationships": [
    { "id": "case-evidence", "label": "is supported by", "sourceId": "case", "targetId": "evidence", "cardinality": "one-to-many" }
  ],
  "source": ["c09"]
}
```

Concepts ≤ 16, properties ≤ 12 each, relationships ≤ 32, columns 0–3.
`valueType` is one of `text, number, date, boolean, list, reference`;
`cardinality` one of `one-to-one, one-to-many, many-to-one, many-to-many`.

## visual

Only for the three primitives with a shipped renderer.

```json
{
  "kind": "visual",
  "primitiveId": "timeline",
  "variant": "editorial-horizontal",
  "purpose": "Place the four eras of diagramming on one axis so the reader sees the gap the essay is about.",
  "altText": "A timeline from hand-drawn marks to the agent loop, with the present era highlighted.",
  "config": {
    "events": [
      { "title": "Marks", "detail": "c. 30,000 BCE — the first notations." },
      { "title": "Grid", "detail": "c. 3,000 BCE — measured plans." },
      { "title": "Process", "detail": "1921 — the flowchart." },
      { "title": "Model", "detail": "1990s — statistical systems." }
    ]
  },
  "source": ["c01"]
}
```

- `timeline` — 3–12 `events`, each `{ title, detail }`.
- `layered-stack` — variant `isometric-callouts`; its config is the layered
  stack document (a 2–6 layer isometric stack; the registry lists its fields). Prefer
  a site component unless the argument is literally about layers.
- `semantic-infographic` — a region-addressable SVG scene. Only use it when a
  conventional figure cannot carry the argument; it is the most expensive
  primitive in the catalog.

---

## What compose adds

For each block: a stable `id` (`ch01-p2`, `ch01-fig1`, …), `evidence` built
from `source`, claim `{start, end}` offsets, and `editorialState`. At document
level: `visualLanguage.preferredPrimitiveIds` from the figures you cast, the
`kind`, the `categoryId`, and `status: "ready"`.

Never edit `document.json` by hand — fix `blocks.json` and recompose.
