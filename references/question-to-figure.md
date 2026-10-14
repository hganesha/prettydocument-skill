# From the question to the figure

The casting table picks a figure by the chapter's *job*. This file starts one
step earlier, from the **question the chapter answers**, because that is how
most arguments are actually written. It also carries recipes for the AI-systems
topics these essays return to most.

Adapted from a framework-template library that makes the same point: match the *question*, not the keyword. Only the
structure is carried over. **Such templates ship sample numbers and sample
names so people have something to overwrite. None of that is evidence.** Every
number, name and quote in a figure still traces to a source chunk.
A framework is a prompt for how to think about the material, never a source of
facts.

## How to use it

1. State the chapter's question in one sentence ("Why did the cost per outcome
   stop falling?").
2. Find the nearest row below. If two rows fit, choose one and say why in
   `structureNotes`. Do not build both.
3. Check the figure against the capacity table in `layout-and-flow.md`.
4. If the source does not contain the content the figure needs, write prose.

Components marked **generic** render through the reader's generic arrangement
(plainer, but safe). Prefer the others when two fit. See the casting table for
variants and region rules.

## Questions → figures

| The question | Cast | Notes |
| --- | --- | --- |
| What are the parts of a whole, and what does each hold? | `region-grid` (`pillars`) | 2–6 named regions; four lay out as 2×2. |
| Strengths, weaknesses, opportunities, threats? | `region-grid` (`swot`) | Exactly four regions. Only when the source actually sorts them. |
| What changed: from where, to where? | `comparison` (`before-after`) | Exactly two regions; pair each point with its counterpart. |
| Where does each option sit on two dimensions? | `semantic-matrix` (`two-by-two`) | The axes come from the argument. Name all four regions. Not a data scatter. |
| How do claims, risks or findings sort into named groups? | `semantic-matrix` (`crosswalk-grid`) | 2–6 groups. |
| Which option, and on what criteria? | `comparison-matrix` (`three-subject`) | Fixed subjects, matched rows. A verdict per column, never a ranking. |
| What are the stages, and how does state change between them? | `system-flow` | At most 4 stages in a row. Stages must transform, not just continue. |
| Who does what, and where does responsibility pass? | `swimlane` | 2–6 lanes. Use this for a responsibility matrix too; do not build a grid of letters. |
| What is the rollout, and in what order? | `horizons` (`now-next-later`, `phases`) | 2–5 regions. Order is sequence, not magnitude. |
| Where are we on a path to maturity? | `staircase` (`maturity-levels`) **generic** | Levels must be defined in the source, not invented. |
| What compounds, or loops back on itself? | `feedback-loop` **generic** | Name what changes each turn. A cycle that only repeats is a list. |
| What is at the centre, and what depends on it? | `orbital-system` (`hub-and-spoke`) **generic** | A real centre. Not a peer network. |
| What contains what? | `nested-containment` **generic** | Only if the containment is real. |
| How does one thing narrow into a decision? | `funnel` (`decision`, `convergence`) **generic** | The story is compression. At most 4 stages. |
| What branches from one cause or choice? | `branching-tree` **generic** | One origin, divergent outcomes. |
| What is the spectrum, and where are the endpoints? | `continuum` (`bounded-spectrum`) **generic** | The endpoints must mean something. |
| What are the layers, and what does each enable? | `architecture-stack` (`vertical-tiers`) | Stacking is the argument. Not for chronology. |
| What crosses a boundary, and what is refused there? | `boundary` (`membrane`, `human-gate`) **generic** | The perimeter is the point. |
| What does the number decompose into? | chart `waterfall` | Only with a table of real values in the source. |
| How does the cost or value equation work? | `semantic-equation` (`value-equation`) **generic** | A defined ratio, written with the source's own terms. |

### Frameworks the catalog cannot draw

A framework library has more classic frameworks than the catalog has figures.
Iceberg, house, Venn, pyramid, bow-tie, five-forces and journey maps have no
catalog component. **Do not force them into the nearest shape.** Write the
argument as prose, or cast the structure that is actually true: a house is
usually `region-grid` or `architecture-stack`, a pyramid is usually
`architecture-stack`. If an essay needs one of these and nothing fits, say so;
it is a renderer gap, not an authoring problem.

## AI-systems recipes

These are topics where the argument has a known shape. Each row gives the
figure that fits that shape, and **what the source must supply**. If it does
not, leave the figure out.

| Topic | Cast | The source must supply |
| --- | --- | --- |
| The layers of an AI product, with a control layer spanning them | `architecture-stack` (`vertical-tiers`) | The layers as the source names them. Say the cross-cutting control and learning plane in prose; a stack cannot draw "across". |
| An agent's loop: perceive, plan, act, observe, evaluate | `feedback-loop` **generic** | At most 6 steps, so merge neighbours (perceive and understand). Say where a person can exit. |
| What the model knew, and why it was allowed to | `system-flow` | Four stages: sources → filters → retrieval → the request. The policy that gates each. |
| Should the system answer, retrieve, call a tool, ask, or refuse? | `branching-tree` **generic** | The actual criteria and exits, not a generic decision tree. |
| What each tool lets the agent do (read, write, approve, destroy) | `semantic-matrix` (`crosswalk-grid`) | The tools and their real authority. Never a permission the source does not state. |
| How much autonomy for which consequence | `continuum` (`bounded-spectrum`) **generic** | The scale's endpoints and levels as defined in the source. Which processes sit where is a claim the source must make. |
| An orchestrator and its specialists | `orbital-system` (`hub-and-spoke`) **generic** | Who the centre is and what each spoke may touch. |
| Agents handing work to one another | `swimlane` (`handoff-trace`) | Lanes (2–6) and what passes between them. |
| A single run, turn by turn | `swimlane` (`agent-trace`) | A real trace. Never a plausible invented one. |
| Routing work to different models | `branching-tree` **generic** | The routing criteria and destinations as stated. |
| Turning production behaviour into improvement (evaluation loop) | `feedback-loop` **generic** | What each pass produces (traces, cases, checks, release). At most 6 steps. |
| The lifecycle: design, evaluate, deploy, trace, learn | `feedback-loop` **generic** | Six steps is the ceiling. |
| What went wrong, classified by cause | `card-grid` (`cards`) | One card per class, each with an example the source gives. Up to 12. |
| Where untrusted content ends and authority begins | `boundary` (`membrane`, `human-gate`) **generic** | The boundary and what is checked at it. |
| The economics of an outcome | `semantic-equation` (`value-equation`) **generic** | The ratio as the source defines it. Numbers only if the source has them. |
| A pilot, then a staged scale plan | `horizons` (`phases`) | The phases and their exit criteria. |

Two things framework templates get right and an essay should keep:

- **Say what the figure leaves out.** Horizon pairs every diagram with a
  criteria table. Here that is the caption: what the figure does not
  show, and what would change it.
- **Targets are hypotheses.** Where a recipe maps processes to an autonomy
  level, the level is a claim to be defended in prose, not a label the figure
  can assert on its own.

## When the question has no row

A chapter whose question matches no row usually wants prose. Roughly one
chapter in three should have no figure anyway.
