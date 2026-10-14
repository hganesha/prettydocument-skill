# prettydocument-skill — agent notes

This repository is an agent skill. The skill itself is `SKILL.md`; read it and
follow it when asked to turn a document into a visual essay, or to put a logo and
title on one.

- Run scripts as `node <this-directory>/scripts/<name>.mjs` from the user's
  working folder, not from here. Drafts, brand and output belong to the user.
- The output is validated JSON plus one standalone HTML page. Never write React,
  CSS, HTML or SVG into an essay, and never hand-edit `document.json`.
- `vendor/` is generated build output from the FieldNotes monorepo. Do not edit it.
- Branding (logo and title) is set with `scripts/brand.mjs` and is off by default.
  Do not add a name, logo or catalog link the user did not ask for.
- Run `npm test` before considering a change to the scripts done.
