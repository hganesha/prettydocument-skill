# Validation report — The discernment frame

- **Contract** (packages/contracts): pass
- **Editorial lint**: 0 error(s), 2 warning(s)
- **Verdict**: ready with warnings

| measure | value |
| --- | --- |
| chapters | 8 |
| words | 2,191 |
| reading time | 10 min |
| figures | 6 |
| pullquotes | 2 |
| chunks cited | 15/20 |

## Warnings

- chapters[2] (slide-4-imagination-header-principle).blocks[6]: 5 items in a system-flow. The reader fits 4 to a row, so the rest wrap and the last arrow points at nothing. Merge stages, or cast a different component.
- chapters[4] (slide-8-perseverance-header-principle).blocks[2]: feedback-loop renders through its generic family arrangement, not a purpose-built figure.

## Uncited source

No block cites c02, c17, c18, c19, c20. Either use the material or record in plan.json → structureNotes why it was dropped.

## Casting

- region-grid: 1
- system-flow: 1
- comparison: 1
- feedback-loop: 1
- semantic-matrix: 1
- architecture-stack: 1

## Fixing this

Edit plan.json or blocks.json, then:

```bash
node skills/fieldnotes-visual-essay/scripts/compose.mjs --draft drafts/discernment-frame
node skills/fieldnotes-visual-essay/scripts/validate.mjs --draft drafts/discernment-frame
```
