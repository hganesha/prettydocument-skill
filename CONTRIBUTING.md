# Contributing

## What is hand-written and what is generated

| Path | Origin |
| --- | --- |
| `SKILL.md`, `references/`, `scripts/`, `test/`, `install.mjs` | hand-written here |
| `vendor/engine.mjs` | generated: the publication contract, the renderer and React, bundled |
| `vendor/reader.css`, `vendor/layout-families.json` | generated from the renderer |
| `registry/authoring-registry.json` | generated from the contract's component catalog |

The generated files come from the FieldNotes monorepo, which owns the contract
(`packages/contracts`) and the renderer (`packages/renderer`). Never edit them
here. To refresh them, in the monorepo:

```bash
npm run prettydocument:vendor          # rebuild into prettydocument-skill/vendor and registry/
npm run prettydocument:vendor:check    # exits non-zero if they are stale (use in CI)
```

then copy `vendor/` and `registry/` into this repository and run `npm test`.
A catalog or renderer change that does not reach this repository means the
skill drafts essays against figures the page can no longer draw.

## Rules the tests enforce

- A published page contains no FieldNotes wording, no catalog link, and no script.
- Without a brand the page has no masthead.
- A logo is a local image, embedded, and an unsafe SVG is refused.
- Nothing is written inside the skill directory when it runs.
