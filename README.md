# QueryPal — Talk to Your Database in Plain English

A conversational AI that turns natural language questions into SQL queries, visualizations, and insights. Built with multi-turn context so follow-up questions like "break that down by country" just work.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Ollama](https://img.shields.io/badge/Ollama-Local-green)
![Claude](https://img.shields.io/badge/Claude-Sonnet_4-purple)
![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-blue)
![SQLite](https://img.shields.io/badge/SQLite-3-green)

## Quick Start (30 seconds)

```bash
git clone <repo-url> && cd querypal
cp .env.example .env.local
# Edit .env.local — set AI_PROVIDER and the matching API key (see below)
npm install
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start asking questions.

### LLM Provider Config

QueryPal supports **Ollama** (free, local), **Gemini**, and **Claude**. Set `AI_PROVIDER` in `.env.local`:

| Provider | Env vars needed | Cost |
|---|---|---|
| **Ollama** (default) | `AI_PROVIDER=ollama` | Free — runs locally |
| **Gemini** | `AI_PROVIDER=gemini` + `GOOGLE_API_KEY` | Free tier available |
| **Claude** | `AI_PROVIDER=claude` + `ANTHROPIC_API_KEY` | Paid |

**Ollama setup** (recommended for local dev):
```bash
# Install Ollama: https://ollama.com
ollama pull qwen2.5-coder:14b   # Best for NL-to-SQL (needs ~10GB RAM)
ollama serve                     # Starts on localhost:11434
```

Override the model with `OLLAMA_MODEL`, `GEMINI_MODEL`, or `CLAUDE_MODEL` env vars.

## What It Does

- **Natural language to SQL** — Ask "How many customers do we have?" and get the SQL, result, and a chart automatically
- **Multi-turn conversation** — Follow up with "Break that down by country" and it modifies the previous query intelligently
- **Auto-visualization** — Dual-layer chart recommendation: the LLM suggests a chart type based on intent, then a client-side heuristic validates against actual data shape
- **Schema intelligence** — Auto-introspects the database schema, samples categorical values, infers foreign key relationships, and injects it all into the LLM context
- **Ambiguity detection** — When a question is unclear (e.g. "Show me revenue"), asks a clarifying question with specific options instead of guessing wrong
- **SQL safety** — Read-only enforcement with word-boundary regex matching, multi-statement blocking, and parameterized execution

## Architecture

```
User types a question
  → Context Manager (assembles conversation history + schema context)
  → LLM (Ollama/Gemini/Claude — generates SQL + explanation + chart type + follow-ups)
  → SQL Validator (read-only check, keyword blocklist, injection prevention)
  → SQLite Executor (safe execution with LIMIT + timeout)
  → Chart Recommender (LLM suggestion validated by data-shape heuristic)
  → Response (SQL + chart + explanation + follow-up suggestions)
```

### How Multi-Turn Works

Most NL-to-SQL tools are single-turn — each question starts from scratch. QueryPal maintains conversation context:

1. After each query, the result is compressed into a summary: `"10 rows. Columns: country, count. Top: US=56. Total: 150."`
2. This summary (not the full data) is included in the next Claude API call as conversation history
3. The system prompt instructs Claude: "When the user says 'that/those/it', modify the MOST RECENT SQL"
4. History is capped at 10 turns to avoid context overflow
5. The system prompt uses `cache_control: { type: 'ephemeral' }` so the schema doesn't need to be re-processed on follow-ups

### Dual-Layer Chart Recommendation

1. Claude recommends a chart type based on the semantic intent of the question
2. A client-side heuristic validates against the actual data shape:
   - Single row with numeric value → KPI card (big number)
   - Date + numeric columns, 3+ rows → Line chart
   - Text + numeric, 2-15 rows → Bar chart
   - Text + numeric, 2-7 rows → Pie chart
   - Everything else → Data table
3. If the LLM recommendation conflicts with the data shape (e.g. "pie chart" for 50 rows), the heuristic wins

### Schema Intelligence

The schema introspector reads SQLite metadata via PRAGMA queries and:
- Samples distinct values for low-cardinality columns (<20 distinct values)
- This is critical — without it, the LLM writes `WHERE country = 'United States'` instead of `WHERE country = 'US'`
- Infers implicit foreign keys by naming convention (`customer_id` → `customers.id`)
- Includes 3 sample rows and row counts per table
- Caches the result for the lifetime of the process

## Demo Dataset

The app ships with a pre-seeded SaaS business analytics database (SQLite) with deliberate patterns that make queries return real insights:

| Table | Rows | Purpose |
|---|---|---|
| customers | 150 | Signups across 10 countries, 4 plan tiers, 6 industries |
| subscriptions | 172 | Active/churned/trial statuses with MRR data |
| invoices | 500 | Paid/pending/overdue with date patterns |
| products | 20 | 5 categories with varied pricing |
| orders | 400 | Customer purchases with quantities and amounts |
| support_tickets | 300 | 4 priority levels, multiple statuses |

**Baked-in patterns:**
- Brazil growth spike in March 2025 → "which country grew fastest?" returns a real insight
- Enterprise customers have lower churn → segmentation queries are interesting
- Churned customers generate more support tickets → correlation queries reveal patterns
- Seasonal signup trends → time-series queries show real shapes

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main chat page
│   ├── layout.tsx                  # Root layout with metadata
│   └── api/
│       ├── chat/route.ts           # POST: NL → SQL → results → chart
│       └── schema/route.ts         # GET: database schema info
├── lib/
│   ├── db/
│   │   ├── connection.ts           # SQLite singleton (read-write + read-only)
│   │   ├── schema-introspector.ts  # Tables, columns, FKs, sample values
│   │   ├── seed.ts                 # Deterministic demo dataset generation
│   │   └── executor.ts             # Safe query execution (LIMIT injection)
│   ├── ai/
│   │   ├── claude-client.ts        # Anthropic SDK wrapper with prompt caching
│   │   ├── prompts.ts              # System prompt with schema, rules, few-shots
│   │   ├── context-manager.ts      # Conversation history + result summaries
│   │   └── response-parser.ts      # JSON parsing with graceful degradation
│   ├── sql/
│   │   ├── validator.ts            # SELECT-only enforcement + blocklist
│   │   └── formatter.ts            # SQL pretty-printing
│   └── viz/
│       └── chart-recommender.ts    # LLM rec + data-shape heuristic fallback
├── components/
│   ├── chat/                       # Chat UI: container, input, messages, welcome
│   ├── results/                    # Result display: charts, tables, SQL view
│   └── schema/                     # Schema browser sidebar
├── hooks/                          # use-chat, use-schema, use-auto-scroll
├── types/                          # TypeScript interfaces
└── __tests__/                      # 45 tests across 7 suites
```

## Tech Stack

| Tool | Why |
|---|---|
| Next.js 16 (App Router) | Fullstack React with API routes |
| TypeScript | Type safety across the entire pipeline |
| TailwindCSS + shadcn/ui | Beautiful UI without dependency lock-in |
| better-sqlite3 | Zero-setup, ships in repo, synchronous for simple API routes |
| Ollama / @anthropic-ai/sdk / @google/generative-ai | Multi-provider: Ollama (local), Claude, or Gemini — configurable via env |
| Recharts | Best React charting library for analytics visualizations |

## Testing

```bash
npm test
```

45 tests across 7 suites covering:

- **SQL Validator** (11 tests): Allows SELECT/CTE, blocks mutations (INSERT/UPDATE/DELETE/DROP), word-boundary matching avoids false positives on column names, multi-statement injection prevention
- **Chart Recommender** (7 tests): KPI for single values, line for time-series, bar for categorical, LLM override when incompatible with data shape
- **Context Manager** (7 tests): Result summary compression, prompt caching setup, conversation history assembly with SQL and summaries, history truncation
- **Response Parser** (5 tests): Valid JSON, markdown fence stripping, malformed JSON graceful degradation, clarification responses
- **Executor** (5 tests): LIMIT injection, existing LIMIT preservation, subquery LIMIT handling
- **ChatInput** (4 tests): Enter to send, Shift+Enter for newline, input clearing, empty input prevention
- **ChartRenderer** (5 tests): Correct component dispatching for each chart type

## Key Design Decisions

### What I Built

| Feature | Why it matters |
|---|---|
| Multi-turn conversation | The core differentiator — most NL-to-SQL tools are single-turn |
| Dual-layer chart recommendation | LLM intent + data-shape validation prevents wrong chart types |
| Schema intelligence with value sampling | Prevents "United States" vs "US" errors in generated SQL |
| Result summary compression | Enables long conversations without context overflow |
| Prompt caching | Production cost optimization — schema doesn't re-process on follow-ups |
| Deliberately patterned demo data | Queries return real insights, not random noise |

### What I Deliberately Excluded

| Feature | Why excluded | What production would need |
|---|---|---|
| Authentication | Zero demo value, adds friction | NextAuth.js + OAuth providers |
| External DB connections | Needs networking/credentials/security | Connection string input, SSL, connection pooling |
| Streaming responses | Added complexity for 2-4s total latency | Anthropic streaming API + SSE |
| Query history persistence | Needs session storage | localStorage or database |
| CSV/file upload | File parsing edge cases distract from core | csv-parser + auto-schema detection |
| Multiple SQL dialects | Dialect handling adds complexity | Adapter pattern per dialect |

These aren't missing features — they're scoped decisions. The excluded items are well-understood problems with known solutions. The included items (multi-turn context, dual-layer visualization, schema intelligence) are the hard problems that demonstrate engineering depth.

## What I'd Add With More Time

1. **Streaming responses** — Show SQL as it generates, stream chart rendering
2. **Query history with favorites** — Save and replay useful queries
3. **Schema diff detection** — Detect when the database schema changes and invalidate cache
4. **Query optimization suggestions** — Flag slow queries and suggest indexes
5. **Export to CSV/PDF** — Let users download query results
6. **Collaborative sessions** — Share query conversations with teammates
7. **Custom database connections** — Connect to any Postgres/MySQL/SQLite database
