# QueryPal — Talk to Your Database in Plain English

A conversational AI that turns natural language questions into SQL queries, visualizations, and insights — with persistent chat history, multi-database support, and multi-turn context so follow-up questions like "break that down by country" just work.


![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)
![Claude](https://img.shields.io/badge/Claude-Sonnet_4-purple)
![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-blue)

## Quick Start

**Prerequisites**: A Gemini API key (free) or Anthropic API key, and a PostgreSQL connection string.

```bash
git clone <repo-url> && cd querypal
bash setup.sh
```

The script installs dependencies and creates `.env.local`. Then open `.env.local`, add your AI API key, and run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Tables and demo data are created on the first request — no migration step.

### AI Provider

Set `AI_PROVIDER` in `.env.local`:

| Provider | Env vars needed | Notes |
|---|---|---|
| **Gemini** (default) | `AI_PROVIDER=gemini` + `GOOGLE_API_KEY` | Free tier at [aistudio.google.com](https://aistudio.google.com/apikey) |
| **Claude** | `AI_PROVIDER=claude` + `ANTHROPIC_API_KEY` | Best SQL quality |
| **Ollama** | `AI_PROVIDER=ollama` | Local only — does NOT work on Vercel |

## Deploying to Vercel

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Set environment variables in the Vercel dashboard:
   - `APP_DATABASE_URL` — use a serverless-compatible provider:
     - [Neon](https://neon.tech) (recommended — use the `-pooler` endpoint URL)
     - [Supabase](https://supabase.com)
     - [Railway](https://railway.app)
   - `AI_PROVIDER` + the matching API key (`GOOGLE_API_KEY` or `ANTHROPIC_API_KEY`)
4. Deploy — the app bootstraps its own schema on first request

> **Note**: Ollama (`AI_PROVIDER=ollama`) requires a local process and does not work on Vercel. Use Gemini or Claude for any hosted deployment.

## What It Does

- **Natural language to SQL** — Ask "How many customers do we have?" and get the SQL, result, and a chart automatically
- **Multi-turn conversation** — Follow up with "Break that down by country" and it modifies the previous query intelligently — "that" refers to the previous context
- **Persistent chat history** — Conversations survive page refresh. Each conversation has its own URL (`/c/[id]`). Charts and tables are stored alongside SQL so revisiting shows the full result
- **Multi-database support** — Connect any PostgreSQL database via the admin panel. Switch databases from the header without losing history
- **Auto-visualization** — Dual-layer chart recommendation: the LLM suggests a chart type based on intent, then a client-side heuristic validates against actual data shape
- **Schema intelligence** — Auto-introspects the database schema, samples categorical values, infers foreign key relationships, and injects it all into the LLM context
- **Ambiguity detection** — When a question is unclear (e.g. "Show me revenue"), asks a clarifying question with specific options instead of guessing wrong
- **SQL safety** — Read-only enforcement with word-boundary regex matching, multi-statement blocking, and executor-level LIMIT injection

## Architecture

```
User types a question
  → Context Manager (conversation history + compressed result summaries + schema)
  → LLM (Gemini/Claude/Ollama — generates SQL + explanation + chart type + follow-ups)
  → SQL Validator (read-only check, keyword blocklist, multi-statement prevention)
  → PostgreSQL Executor (safe execution with LIMIT + statement_timeout)
  → Chart Recommender (LLM suggestion validated by data-shape heuristic)
  → Conversation Repository (persist message + result_data as JSONB)
  → Response (SQL + chart + data + explanation + follow-up suggestions)
```

### How Multi-Turn Works

Most NL-to-SQL tools are single-turn — each question starts from scratch. QueryPal maintains full conversation context:

1. After each query, the result is compressed into a summary: `"10 rows. Columns: country, count. Top: US=56. Total: 150."`
2. This summary (not the full data) is included in the next LLM call as conversation history
3. The system prompt instructs the LLM: "When the user says 'that/those/it', modify the MOST RECENT SQL"
4. History is capped at 10 turns to avoid context overflow
5. Previous SQL and summaries are included in history so the LLM can reference and modify them

### How Conversation Persistence Works

QueryPal uses a route group layout pattern — the same architecture as ChatGPT and Claude:

- `(chat)/layout.tsx` renders `ChatContainer` once and persists across `/` and `/c/[id]` navigation
- When a new conversation is created, `router.replace('/c/[id]')` updates the URL without remounting
- The `fetchedForRef` pattern prevents the URL change from triggering a DB re-fetch that would overwrite in-memory message state
- `result_data JSONB` stores the full query result in PostgreSQL alongside the SQL and chart config
- Revisiting a past conversation loads data directly from the DB — no re-execution needed

### Dual-Layer Chart Recommendation

1. The LLM recommends a chart type based on the semantic intent of the question
2. A client-side heuristic validates against the actual data shape:
   - Single row with numeric value → KPI card (big number)
   - Date + numeric columns, 3+ rows → Line chart
   - Text + numeric, 2-15 rows → Bar chart
   - Text + numeric, 2-7 rows → Pie chart
   - Everything else → Data table
3. If the LLM recommendation conflicts with the data shape (e.g. "pie chart" for 50 rows), the heuristic wins

### Schema Intelligence

The schema introspector reads PostgreSQL's `information_schema` and:
- Samples distinct values for low-cardinality columns (<20 distinct values)
- This is critical — without it, the LLM writes `WHERE country = 'United States'` instead of `WHERE country = 'US'`
- Reads foreign key relationships so the LLM knows how to JOIN tables correctly
- Includes row counts and data types
- Results are cached per connection with a 5-minute TTL + stale-while-revalidate

### SQL Auto-Retry

If the LLM generates SQL with a column or table error (detected via regex on the PostgreSQL error message), the route makes one corrective LLM pass: sends the exact error back with schema guidance and asks for a fixed query. This handles hallucinated column names without surfacing the error to the user.

## Demo Database

The app ships with a pre-seeded SaaS business analytics database (5 tables in the `demo` PostgreSQL schema):

| Table | Rows | Purpose |
|---|---|---|
| customers | 20 | Signups across multiple countries, 4 plan tiers |
| products | 12 | 5 categories with varied pricing |
| orders | 80 | Customer orders with status and totals |
| order_items | 160 | Line items linking orders to products |
| support_tickets | 40 | 4 priority levels, multiple statuses |

The demo connection is pre-registered in the admin panel. Seeding is idempotent — the app checks for existing data on startup and skips if already seeded.

## Project Structure

```
src/
├── app/
│   ├── (chat)/                     # Route group — layout persists across / and /c/[id]
│   │   ├── layout.tsx              # Renders ChatContainer once, never remounts
│   │   ├── page.tsx                # New chat (null — layout owns the UI)
│   │   └── c/[id]/page.tsx         # Conversation page (null)
│   ├── admin/page.tsx              # Database connection management
│   └── api/
│       ├── chat/route.ts           # POST: NL → SQL → results → chart → persist
│       ├── conversations/          # CRUD for conversations + messages
│       ├── connections/            # CRUD for database connections
│       └── schema/route.ts         # GET: schema info for a database
├── lib/
│   ├── db/
│   │   ├── app-db.ts               # App DB pool + self-bootstrapping schema init
│   │   ├── conversation-repository.ts  # Conversation + message CRUD
│   │   ├── connection-registry.ts  # Connection CRUD (PostgreSQL-backed)
│   │   ├── connection-manager.ts   # getAdapter() + schema cache
│   │   ├── adapter.ts              # DatabaseAdapter interface
│   │   ├── pg-adapter.ts           # PostgreSQL adapter
│   │   ├── schema-introspector.ts  # Tables, columns, FKs, sample values
│   │   └── executor.ts             # Safe query execution
│   ├── ai/
│   │   ├── providers.ts            # LLM provider abstraction
│   │   ├── prompts.ts              # System prompt with schema, rules, few-shots
│   │   ├── context-manager.ts      # Conversation history + result summaries
│   │   └── response-parser.ts      # JSON parsing with graceful degradation
│   ├── sql/validator.ts            # SELECT-only enforcement + blocklist
│   └── viz/chart-recommender.ts   # LLM rec + data-shape heuristic fallback
├── components/
│   ├── chat/                       # ChatContainer, sidebar, messages, input, welcome
│   ├── results/                    # Charts, tables, SQL display, result panel
│   ├── admin/                      # Connection management UI
│   └── onboarding/                 # Welcome modal
├── hooks/                          # use-chat, use-conversations, use-schema
├── contexts/                       # DatabaseContext (selected DB, stored in localStorage)
└── types/                          # TypeScript interfaces
```

## Tech Stack

| Tool | Why |
|---|---|
| Next.js 15 (App Router) | Fullstack React — route groups for layout persistence, API routes for server-side LLM/DB calls |
| TypeScript | Type safety across the entire pipeline |
| TailwindCSS + shadcn/ui | Beautiful UI without dependency lock-in |
| PostgreSQL + `pg` | JSONB for structured storage, connection pooling, schema namespacing — no native binary issues on Vercel |
| Gemini / Claude / Ollama | Multi-provider via a `CallLLM` abstraction — swap by changing one env var |
| Recharts | Best React charting library for analytics visualizations |
| uuid | Deterministic conversation and message IDs |

## Key Design Decisions

### What I Built

| Feature | Why it matters |
|---|---|
| Multi-turn conversation | The core differentiator — most NL-to-SQL tools are single-turn |
| Persistent chat history + URLs | Conversations survive refresh; shareable URLs; familiar UX (ChatGPT/Claude pattern) |
| `result_data` JSONB storage | Charts and tables persist across sessions without re-executing queries |
| Route group layout pattern | Zero-flicker navigation — no component remount between `/` and `/c/[id]` |
| Multi-database connections | Connect any PostgreSQL database via admin panel; switch without losing history |
| Dual-layer chart recommendation | LLM intent + data-shape validation prevents wrong chart types |
| Schema intelligence with value sampling | Prevents "United States" vs "US" errors in generated SQL |
| SQL auto-retry on column errors | Transparent recovery without surfacing LLM mistakes to the user |
| Optimistic sidebar updates | No API call after each message; sidebar updates from local state |

### What I Deliberately Excluded

| Feature | Why excluded | What production would need |
|---|---|---|
| Authentication | Zero demo value, adds friction | NextAuth.js + OAuth providers |
| Streaming responses | Added complexity for 2-5s total latency | SSE + `ReadableStream` in route handler |
| MySQL / SQL Server adapters | PostgreSQL covers the demo + real use case | New `DatabaseAdapter` implementation per dialect |
| CSV/file upload | File parsing edge cases distract from core | csv-parser + auto-schema detection |
| Query export | Nice-to-have | PDF/CSV download from result panel |
| Row-level access control | Out of scope for demo | PostgreSQL RLS + table-level ACL in schema introspector |

These aren't missing features — they're scoped decisions. The excluded items are well-understood problems with known solutions. The included items (multi-turn context, persistent history, multi-database, route group navigation) are the hard problems that demonstrate engineering depth.

## What I'd Add With More Time

1. **Streaming responses** — Stream LLM tokens and show explanation in real-time; perceived latency drops from 8s to <1s
2. **Row-level access control** — Table/column-level ACL per user role; enforcement at the PostgreSQL RLS layer
3. **Schema diff detection** — Detect `ALTER TABLE` and invalidate the schema cache automatically
4. **Query export** — Download results as CSV or copy as Markdown table
5. **Inline SQL editing** — Let users modify generated SQL directly in the result panel and re-run
6. **MySQL / SQL Server adapters** — The `DatabaseAdapter` interface makes each new dialect a ~200-line file
7. **Rate limiting** — Protect the LLM endpoint from abuse; per-IP throttling at the API route level
