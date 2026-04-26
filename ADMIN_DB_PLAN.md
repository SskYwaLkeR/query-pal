# Admin-Configurable Database Connections (SQLite + PostgreSQL)

## Context

QueryPal currently hardcodes a single SQLite demo database. A real user would want to point it at their own local PostgreSQL or SQLite databases. This adds an admin page for managing connections, a database adapter layer supporting both engines, and a selector in the chat UI.

## Architecture

```
Admin Page (/admin)
  → Connection Registry (data/connections.json)
  → Test Connection endpoint

Chat UI (database selector dropdown in header)
  → ConnectionManager (adapter cache + schema cache)
  → DatabaseAdapter interface
      ├── SqliteAdapter (better-sqlite3, PRAGMAs)
      └── PostgresAdapter (pg, information_schema)
  → rest of pipeline unchanged (LLM → validator → executor → charts)
```

## Implementation Phases

### Phase 1: Types + Connection Registry

**New: `src/types/connection.ts`**
```typescript
interface ConnectionConfig {
  id: string;
  name: string;
  type: 'sqlite' | 'postgresql';
  sqlitePath?: string;
  connectionString?: string;
  isDefault?: boolean;
  createdAt: string;
}
```

**New: `src/lib/db/connection-registry.ts`**
- Read/write `data/connections.json` (gitignored)
- `loadConnections()`, `saveConnections()`, `addConnection()`, `updateConnection()`, `deleteConnection()`
- `ensureDefaultConnection()` — seeds demo.db entry if missing, called lazily on first load

**Modify: `.gitignore`** — add `data/connections.json`

### Phase 2: Database Adapter Layer

**New: `src/lib/db/adapter.ts`** — interface:
```typescript
interface DatabaseAdapter {
  readonly dialect: 'sqlite' | 'postgresql';
  query(sql: string): Promise<{ columns: string[]; rows: Record<string, unknown>[] }>;
  getSchema(): Promise<SchemaInfo>;
  testConnection(): Promise<void>;
  close(): Promise<void>;
}
```

**New: `src/lib/db/adapters/sqlite-adapter.ts`**
- Wraps better-sqlite3 (sync calls → Promise.resolve)
- `getSchema()` lifts existing logic from `schema-introspector.ts` (PRAGMAs, sample values, FK inference)

**New: `src/lib/db/adapters/postgres-adapter.ts`**
- Uses `pg.Pool` for connection pooling
- `getSchema()` uses `information_schema.tables`, `information_schema.columns`, `information_schema.key_column_usage`
- Sample values + row counts via same approach as SQLite adapter

**New: `src/lib/db/adapter-factory.ts`**
- `createAdapter(config: ConnectionConfig): DatabaseAdapter`

**New: `src/lib/db/connection-manager.ts`** — singleton:
- `Map<string, DatabaseAdapter>` — active adapter cache
- `Map<string, SchemaInfo>` — schema cache per connection
- `getAdapter(connectionId)`, `getSchema(connectionId)`, `resetSchema(connectionId)`, `removeAdapter(connectionId)`
- `testConnection(config)` — creates temp adapter, tests, closes

**Install: `pg` + `@types/pg`**
**Modify: `next.config.ts`** — add `pg` to `serverExternalPackages`

### Phase 3: Refactor Executor + Prompts

**Modify: `src/lib/db/executor.ts`**
- `executeQuery(adapter: DatabaseAdapter, sql: string): Promise<QueryResult>`
- `addLimitIfMissing()` stays unchanged (works for both dialects)

**Modify: `src/lib/ai/prompts.ts`**
- `buildSystemPrompt(schemaSummary, dialect: 'sqlite' | 'postgresql')`
- PostgreSQL rules: `DATE_TRUNC()`, `EXTRACT()`, `NOW()`, `ILIKE`, `::` casts
- SQLite rules: current `date()`, `strftime()`, `julianday()`

**Modify: `src/lib/sql/formatter.ts`**
- Accept dialect param, pass to sql-formatter

### Phase 4: API Routes

**New: `src/app/api/connections/route.ts`** — `GET` list all, `POST` create
**New: `src/app/api/connections/[id]/route.ts`** — `GET` one, `PUT` update, `DELETE` remove
**New: `src/app/api/connections/test/route.ts`** — `POST` test a connection config

**Modify: `src/app/api/schema/route.ts`**
- Accept `?databaseId=` query param (default: `'demo'`)
- Use `ConnectionManager.getSchema(databaseId)`

**Modify: `src/app/api/chat/route.ts`**
- Accept `databaseId` in request body
- Use `ConnectionManager` for adapter + schema
- Pass `adapter.dialect` to `buildSystemPrompt()`
- `await executeQuery(adapter, sql)` instead of sync call
- Remove manual `db.close()` calls (manager owns lifecycle)

**Modify: `src/types/chat.ts`** — add `databaseId?: string` to `ChatRequest`

### Phase 5: Frontend — Context + Hooks

**New: `src/contexts/database-context.tsx`**
- `DatabaseProvider` wrapping chat container
- State: `databases[]`, `selectedDatabaseId`, `setSelectedDatabaseId`, `refreshDatabases()`
- Fetches `GET /api/connections` on mount

**New: `src/components/database-selector.tsx`**
- Dropdown reading from DatabaseContext
- Shows name + type badge (SQLite/PostgreSQL icon) per connection

**Modify: `src/hooks/use-schema.ts`** — accept `databaseId`, pass as query param
**Modify: `src/hooks/use-chat.ts`** — accept `databaseId`, include in POST body

**Modify: `src/components/chat/chat-container.tsx`**
- Wrap with `DatabaseProvider`
- Add `<DatabaseSelector />` in header
- Pass `selectedDatabaseId` to hooks
- Clear conversation when database changes

### Phase 6: Admin Page

**New: `src/app/admin/page.tsx`** — renders admin client component

**New: `src/components/admin/admin-panel.tsx`** — `"use client"`
- List of connections (Card per row: name, type badge, path/host, actions)
- Add/Edit form: Name, Type radio (SQLite/PostgreSQL), Path or Connection String input
- "Test Connection" button → `POST /api/connections/test` → green check or red error
- Save/Delete/Cancel buttons
- Demo connection: shows lock icon, delete disabled
- Gear icon in chat header links to `/admin`, back link on admin page

## Files Summary

**New (14 files):**
- `src/types/connection.ts`
- `src/lib/db/adapter.ts`, `adapters/sqlite-adapter.ts`, `adapters/postgres-adapter.ts`
- `src/lib/db/adapter-factory.ts`, `connection-manager.ts`, `connection-registry.ts`
- `src/app/api/connections/route.ts`, `[id]/route.ts`, `test/route.ts`
- `src/app/admin/page.tsx`, `src/components/admin/admin-panel.tsx`
- `src/components/database-selector.tsx`, `src/contexts/database-context.tsx`

**Modified (11 files):**
- `src/lib/db/executor.ts` — async, takes adapter
- `src/lib/ai/prompts.ts` — dialect param
- `src/lib/sql/formatter.ts` — dialect param
- `src/app/api/chat/route.ts` — ConnectionManager, databaseId
- `src/app/api/schema/route.ts` — ConnectionManager, databaseId query param
- `src/hooks/use-schema.ts`, `use-chat.ts` — databaseId param
- `src/components/chat/chat-container.tsx` — provider, selector, databaseId
- `src/types/chat.ts` — databaseId on ChatRequest
- `.gitignore` — connections.json
- `next.config.ts` — pg in serverExternalPackages
- `package.json` — pg, @types/pg

## Verification

1. Demo.db still works as default — start app, query without touching admin
2. Admin page — add a PostgreSQL connection, test it, save
3. Database selector — switch to PostgreSQL db, schema panel updates, queries generate PostgreSQL syntax
4. Multi-turn — follow-up queries work on both database types
5. Switch back to demo — conversation clears, SQLite syntax resumes
6. `npm test` — all existing tests still pass
7. `npx tsc --noEmit` — no type errors
