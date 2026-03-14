# Design Doc: Research Semantic Zoom

- Status: proposed
- Surface: `web`
- Primary route: `/#/research`
- Last updated: `2026-03-15`

## Summary

The Research surface should not treat "zoom" as a simple fullscreen enlargement of an existing card.
The correct interaction model is **semantic zoom with preserved context**:

1. start from a single analysis surface
2. allow the user to zoom from market/category level into sub-groups and leaf nodes
3. preserve filters, timeframe, breadcrumb path, and hover context while drilling deeper
4. use fullscreen only as a secondary assist, not as the primary model

This design is based on the reference interaction shown in `/Users/ej/Downloads/68bee6393b2e35f8ee2dacb85124e7868a910217.MP4`.

## Problem

The current Research layout is optimized as a dashboard of tiles.
That layout is useful for broad status scanning, but it is weak for dense chart inspection.

The user need is not just "make charts bigger."
The user need is:

- inspect dense research structures without losing surrounding context
- move from overview to detail without route changes or modal detours
- compare leaf values against both global and parent group totals
- maintain the same active filter/timeframe while drilling down

If the system only opens a larger modal version of the same chart, the UI becomes a viewer, not an analysis tool.

## Evidence From The Reference Interaction

Observed interaction pattern from the reference video:

- the treemap stays as the primary surface
- hover reveals a compact black stat card with:
  - item label
  - absolute value
  - percent of total
  - percent of parent group
- clicking does not switch routes
- the user drills deeper within the same canvas
- breadcrumb text remains visible and supports returning upward
- timeframe controls remain visible during navigation
- top-level mode toggles and action icons remain attached to the same analytical context

Design conclusion:

- the core interaction is **inline hierarchical exploration**
- not **detached fullscreen inspection**

## Target User

- operator reviewing autoresearch results in real time
- researcher comparing categories, branches, and descendant experiments
- decision-maker trying to understand "why this cluster matters" before acting

## Job To Be Done

When I am exploring dense research output, I want to zoom into a subset without losing the current analytical frame, so that I can inspect detail and still understand where it sits in the whole.

## Goals

- preserve analytical context while increasing detail visibility
- make hierarchical exploration feel continuous and reversible
- keep metrics legible at every zoom depth
- reduce the need for mentally reconstructing parent/child relationships
- support mouse-driven exploration first, with keyboard parity

## Non-Goals

- replacing the entire Research page with a generic BI tool
- opening a new route for every detail level
- using fullscreen modal as the default interaction
- introducing 3D or cinematic transitions that obscure data relationships

## Design Principles

### 1. Context Before Magnification

The user should understand where they are before they see more pixels.
Zoom must preserve:

- current filter scope
- timeframe scope
- breadcrumb path
- visible parent grouping

### 2. Semantic Zoom, Not Optical Zoom

At deeper levels, the UI should not merely scale up the same shapes.
It should reveal new information density appropriate to the current level.

Examples:

- category level: total value, keep rate, top label
- subgroup level: contribution to parent, top descendants
- leaf level: experiment metadata, metric delta, status, provenance

### 3. One Surface, Multiple Depths

Users should feel that they are still in the same analytical workspace.
The canvas changes depth; the product does not "take them somewhere else."

### 4. Hover Must Be Numerically Useful

The hover card is not decoration.
It should answer the immediate comparison questions:

- how large is this?
- how important is it in the global set?
- how important is it inside its parent?

### 5. Return Path Must Be Obvious

Every deeper state needs a clear way back:

- breadcrumb path
- back affordance
- parent summary preserved nearby

## Interaction Model

## Level 0: Overview

The user sees the top-level research distribution.

Required elements:

- top controls
- active metric mode
- timeframe control
- breadcrumb root
- top-level treemap or equivalent density map

Primary actions:

- hover for summary card
- click group to drill down

## Level 1: Group Drill-Down

The selected group becomes the active context.

Required changes:

- breadcrumb updates to `Root > Group`
- canvas redraws to show child nodes of the selected group
- parent summary stays visible
- hover card changes from "percent of total only" to:
  - percent of total
  - percent of parent

Primary actions:

- hover child nodes
- click child node to drill further
- breadcrumb click to move back upward

## Level 2: Leaf Exploration

The user reaches experiment-level or leaf-level entities.

Required elements:

- leaf detail card or side pane
- stable breadcrumb
- current parent context still visible
- selected-node detail state

Leaf detail should include:

- label
- metric
- delta vs baseline or parent
- status
- branch/category
- node provenance if relevant

## Information Architecture

The Research surface should separate two concepts:

1. **navigation state**
2. **visual representation**

Suggested navigation state:

```ts
type ResearchZoomState = {
  metricMode: 'open_interest' | 'volume' | 'score';
  timeframe: '1w' | '2w' | '1m' | '6m' | '1y' | 'ytd' | 'all';
  path: string[]; // breadcrumb hierarchy
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
};
```

The chart component should render from normalized hierarchy data plus `ResearchZoomState`.
The component should not own the canonical truth of navigation by itself.

## Surface Composition

The preferred layout is:

- top control bar
- primary semantic zoom canvas
- persistent timeframe scrubber
- detail/hover layer

The current multi-tile dashboard can still exist, but the dense exploration mode should be treated as a **primary analysis surface**, not just one small card among many.

## Fullscreen Policy

Fullscreen is allowed, but only as a helper mode.

It should be used for:

- small laptop screens
- side-by-side collaboration
- presentation mode

It should not be the first-class answer to drill-down.

If fullscreen exists, it must preserve the same:

- breadcrumb path
- selected node
- filter state
- timeframe

The fullscreen state should inherit the exact semantic zoom state rather than open a disconnected viewer.

## Motion Guidelines

Motion should clarify hierarchy changes.

Recommended:

- quick crossfade or spatial interpolation between parent and child layouts
- subtle highlight persistence for the clicked node during transition
- no heavy zoom blur or cinematic scaling

Motion should help users answer:

- what did I click?
- where did that region go?
- what context did I keep?

## Accessibility

- every drillable node must have keyboard access
- breadcrumb must be keyboard reachable
- hover information must also be available through focus/selection
- percentage and metric values should not rely on color alone
- selected and hovered states must be distinct

## Success Metrics

Primary:

- time to inspect a target subgroup decreases
- drill-down completion rate increases
- fewer back-and-forth context resets during exploration

Behavioral indicators:

- more breadcrumb-based navigation, less route churn
- more leaf inspections per session
- reduced abandonment after entering detailed views

## Implementation Guidance

### Phase 1

- make a single treemap-style analysis surface authoritative
- add breadcrumb state and parent/child drill-down
- add hover summary card with global and parent percentages

### Phase 2

- connect timeframe and metric mode to the same zoom state
- persist selection while resizing or entering assist fullscreen
- add keyboard traversal and selection parity

### Phase 3

- add optional fullscreen that inherits current zoom state
- add animated hierarchy transitions
- attach leaf detail pane to experiment-specific actions

## Implications For The Current Implementation

The current fullscreen modal approach is directionally helpful for readability, but it does not yet match the intended semantic zoom model.

Current gap:

- it enlarges existing cards
- it does not preserve one authoritative zoom canvas
- it does not promote breadcrumb-driven inline exploration to the main interaction

Required follow-up:

- move the Research exploration experience toward inline hierarchical drill-down
- make fullscreen inherit and extend that state rather than replace it

## Done Means

This design is complete when:

- a user can move from overview to leaf detail without route changes
- the parent/total relationship is visible at every depth
- breadcrumb-based reversal is always available
- timeframe and filter state remain stable during drill-down
- fullscreen, if used, mirrors the same navigation state instead of opening a disconnected view
