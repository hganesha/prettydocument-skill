# prettydocument-skill

An agent skill that turns a document somebody already wrote into a **visual
essay**: chapters, sourced claims and figures, published as **one standalone
HTML page** that carries your own logo and title.

Works with any agent that reads `SKILL.md` skills, including **Claude Code** and
**Codex**. It runs entirely on your machine with Node 20+. There is no install
step beyond downloading it, no service and no account.

## Install

Download or clone this repository, then from it:

```bash
node install.mjs            # this project:  ./.claude/skills and ./.codex/skills
node install.mjs --global   # every project: ~/.claude/skills and ~/.codex/skills
```

| Flag | Effect |
| --- | --- |
| `--claude` / `--codex` | only that agent |
| `--target <dir>` | any other skills directory, e.g. `~/.agents/skills` |
| `--copy` | copy instead of symlink (use if you will delete the download) |
| `--uninstall` | remove what the script installed |

The skill is installed under the name `prettydocument`.

## Use it

Work in any folder. Ask your agent in your own words:

> Turn `report.md` into a visual essay.
>
> Convert this into a visual essay for Acme Research, with our logo (`assets/logo.svg`).

The agent ingests the source, plans chapters, casts each argument into a figure,
writes the blocks, validates, previews, and stops at the review checklist before
it publishes. The result is `out/<slug>/index.html`: one file with no
dependencies. Host it anywhere, or send it as an attachment.

## Your logo and title

The masthead at the top of the page is yours. **By default there is none**: the
page is the essay and nothing else, with no site name and no "all essays" link.

```bash
node scripts/brand.mjs init --title "Acme Research" --logo assets/logo.svg \
     --tagline "Notes from the field" --url https://acme.example --footer "© Acme 2026"
```

That writes `brand.config.json` in your working folder (see
[`brand.config.example.json`](brand.config.example.json)), and every preview and
publish from there carries it. Or brand a single run with
`--brand-title "…" --brand-logo path/to/logo.svg`, and drop it with `--no-brand`.

| Setting | Notes |
| --- | --- |
| `title` | up to 60 characters; shown beside the logo and in the page `<title>` |
| `logo` | local `.svg`, `.png`, `.jpg` or `.webp`, up to 256 KB, embedded in the page |
| `logoAlt` | needed when there is a logo and no title |
| `tagline`, `footer` | optional plain text |
| `url` | optional `http(s)` link for the masthead |

Logos are embedded, never fetched, so a page makes no request for its logo. An
SVG that contains script, event handlers, `foreignObject` or external references
is refused rather than cleaned.

Brand is separate from the **design system** (colours and fonts), which has its
own tools: `node scripts/design.mjs list | fonts | init | check`. Neither lives
in the document, so one `document.json` can be published under any brand.

## What is in the box

```text
SKILL.md              the workflow an agent follows
install.mjs           installs the skill for Claude Code, Codex, or any skills directory
scripts/              ingest · scaffold · compose · validate · preview · publish · brand · design
vendor/               the bundled validator and renderer (generated; see CONTRIBUTING.md)
references/           house style, casting table, layout rules, review checklist
registry/             the component catalog the casting rules read
examples/             a finished conversion and a worked design system
test/                 npm test
```

Files you create (`drafts/`, `design-systems/`, `brand.config.json`, `out/`) live
in the folder you work in, never inside the skill. Set `PRETTYDOCUMENT_HOME` to
use a different folder.

## Check it works

```bash
npm test
```
