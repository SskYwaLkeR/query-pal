# Performance Optimization Plan

How QueryPal handles production-scale databases (100K–10M+ rows, 50+ tables).

---

## Bottleneck Analysis

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | **N+1 schema introspection** — one `COUNT(*)`, one `COUNT(DISTINCT col)`, and one `SELECT DISTINCT` per column per table, all sequential | `schema-introspector.ts:52-90` | Critical |
| 2 | **`COUNT(*)` full table scans** — no index-only path for row counts on large tables | `schema-introspector.ts:54` | High |
| 3 | **No query timeout** — user-generated SQL has no execution deadline; a bad query can hang the server | `executor.ts:12` (raw `adapter.query()`) | High |
| 4 | **Infinite schema cache** — never expires, never refreshes; stale after DDL changes | `connection-manager.ts:27-28` | Medium |
| 5 | **Unbounded LLM context** — full schema summary sent every request; at 50+ tables this exceeds token limits | `prompts.ts:16` (schemaSummary injected whole) | Medium |
| 6 | **No pagination** — results capped at 100 rows but no way to fetch the next page | `executor.ts:4` (`MAX_ROWS = 100`) | Low |

---

## Options

### A. Query Timeout Protection

**Effort:** Low (1–2 hours)  
**Impact:** High — prevents server hangs from expensive queries

**What to do:**
- PostgreSQL: prepend `SET statement_timeout = '10000';` (10s) before each user query
- SQLite: use the `busy_timeout` pragma + a JS-side `AbortController` wrapper with 10s deadline
- Return a friendly error: "This query took too long. Try adding filters to narrow down the results."

**Where:** `src/lib/db/executor.ts` — wrap `adapter.query()` call

---

### B. Fast Row Counts (PostgreSQL)

**Effort:** Low (1 hour)  
**Impact:** High — eliminates the biggest single bottleneck for large PG databases

**What to do:**
- Replace `SELECT COUNT(*) FROM table` with:
  ```sql
  SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = $1
  ```
- `n_live_tup` is updated by autovacuum — accurate within ~5% on active databases, instant (catalog lookup, no scan)
- Fall back to exact `COUNT(*)` only for SQLite (which is fast on small files anyway)

**Where:** PostgreSQL adapter's `getSchema()` method

---

### C. Batch Schema Introspection

**Effort:** Medium (3–4 hours)  
**Impact:** High — turns O(tables × columns) queries into O(1)

**What to do:**
- PostgreSQL: single query joining `information_schema.tables`, `information_schema.columns`, `pg_stat_user_tables`, and `pg_constraint`
- SQLite: keep PRAGMA approach but batch `COUNT(DISTINCT)` checks into one query per table using `json_group_array()`
- Remove per-column `SELECT DISTINCT` for tables with >10K rows (sample instead)

**Where:** New `pg-schema-introspector.ts` and refactor of `schema-introspector.ts`

---

### D. Schema Cache with TTL

**Effort:** Low (1 hour)  
**Impact:** Medium — keeps schema fresh without re-introspecting every request

**What to do:**
- Add `cachedAt: number` alongside the schema in the cache Map
- TTL: 5 minutes for production, configurable via env var `SCHEMA_CACHE_TTL_MS`
- On cache miss: introspect and cache
- On cache hit but stale: return cached immediately, trigger background refresh (stale-while-revalidate)
- Reset cache on connection edit/delete (already done in `removeAdapter`)

**Where:** `src/lib/db/connection-manager.ts:27-33`

---

### E. LLM Context Pruning for Large Schemas

**Effort:** Medium (2–3 hours)  
**Impact:** Medium — prevents token overflow and improves LLM accuracy on big schemas

**What to do:**
- If schema summary exceeds 3000 tokens (~12KB), switch to a compressed format:
  - Table names + row counts only (no column details) as the base context
  - Include full column details only for tables mentioned in conversation history or likely relevant to the current question (keyword match on table names in user message)
- Add a "schema too large" note prompting the LLM to ask which tables are relevant if unsure
- Cap total schema context at 4000 tokens regardless

**Where:** `src/lib/ai/context-manager.ts` — new `pruneSchemaForContext(schema, userMessage, history)` function

---

### F. Cursor-Based Pagination

**Effort:** Medium (3–4 hours)  
**Impact:** Low — nice-to-have for power users exploring large result sets

**What to do:**
- Add `OFFSET` support: keep the original query, append `OFFSET N` for page 2+
- Frontend "Load more" button below data table when `truncated === true`
- Store the original SQL in message state so pagination can re-execute with offset
- Cap at 1000 total rows (10 pages) to prevent runaway

**Where:** `src/lib/db/executor.ts` (add `offset` param), `src/components/results/data-table.tsx` (UI), `src/app/api/chat/route.ts` (accept page param)

---

## Recommended Implementation Order

```
Phase 1 (ship first — immediate safety):
  A. Query Timeout        → prevents server hangs
  B. Fast Row Counts      → unblocks large PG databases

Phase 2 (next sprint — quality of life):
  D. Schema Cache TTL     → freshness without cost
  E. Context Pruning      → LLM reliability at scale

Phase 3 (when needed — scaling):
  C. Batch Introspection  → for 50+ table databases
  F. Pagination           → when users ask for it
```

---

## Verification Criteria

- [ ] Query that takes >10s returns timeout error, not a hung request
- [ ] Schema loads in <500ms for a 50-table PostgreSQL database
- [ ] Switching databases shows fresh schema within 5 minutes of DDL changes
- [ ] LLM produces valid SQL for databases with 50+ tables without token errors
- [ ] No regressions on SQLite path (existing demo DB still works)
