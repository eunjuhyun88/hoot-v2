# Runtime API

This directory is the future backend boundary for continuous autoresearch.

## Purpose

- own runtime job lifecycle
- expose job snapshots and command APIs
- fan out SSE events
- become the stable bridge between the browser and autoresearch workers

## Current State

- `src/server.ts` owns in-memory job APIs and now reads real runtime-root summaries through `packages/autoresearch-adapter`
- it is safe to develop in parallel with the existing `scripts/*` controller flow
- it does not replace the current controller yet

### Current endpoints

- `GET /api/runtime/health`
- `GET /api/runtime/snapshot`
- `GET /api/runtime/jobs`
- `POST /api/runtime/jobs`
- `GET /api/runtime/jobs/:jobId`
- `GET /api/runtime/jobs/:jobId/events`
- `POST /api/runtime/jobs/:jobId/commands`
- `GET /api/runtime/upstream`
- `GET /api/runtime/workspaces`
- `GET /api/runtime/mesh`
- `GET /api/runtime/mesh/events`
- `POST /api/runtime/control`

For `workspaces` and `mesh`, pass `?runtimeRoot=runtime/autoresearch-loop-pin-test` or set `AUTORESEARCH_RUNTIME_ROOT` to inspect a specific runtime pack.
`mesh/events` is the cached SSE fanout path for the same runtime root and is the preferred high-fanout read path.
For `control`, pass the same `runtimeRoot` query string and a JSON command body such as `{ "type": "pause" }` or `{ "type": "boost_category", "category": "architecture" }`.

## Next Step

- finish moving remaining page-local polling onto `mesh/events`
- redirect the remaining pages to the same runtime control contract
