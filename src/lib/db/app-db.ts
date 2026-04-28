import { Pool } from "pg";

let pool: Pool | null = null;
let initialized = false;

export function getAppDb(): Pool {
  if (!pool) {
    const url = process.env.APP_DATABASE_URL;

    if (!url && process.env.NODE_ENV === "production") {
      throw new Error(
        "APP_DATABASE_URL environment variable is required. " +
          "Set it to your PostgreSQL connection string (e.g. from Neon, Supabase, or Railway)."
      );
    }

    const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

    pool = new Pool({
      connectionString: url || "postgresql://localhost:5432/querypal",
      max: isServerless ? 2 : 5,
      idleTimeoutMillis: isServerless ? 10_000 : 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

export async function initializeAppDb(): Promise<void> {
  if (initialized) return;

  const db = getAppDb();

  // Core app tables
  await db.query(`
    CREATE TABLE IF NOT EXISTS connections (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      type              TEXT NOT NULL DEFAULT 'postgresql',
      connection_string TEXT,
      schema            TEXT,
      is_default        BOOLEAN DEFAULT false,
      created_at        TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE connections ADD COLUMN IF NOT EXISTS schema TEXT;

    CREATE TABLE IF NOT EXISTS conversations (
      id          TEXT PRIMARY KEY,
      database_id TEXT NOT NULL,
      title       TEXT NOT NULL DEFAULT 'New conversation',
      created_at  TIMESTAMPTZ DEFAULT now(),
      updated_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id              TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content         TEXT NOT NULL DEFAULT '',
      sql             TEXT,
      chart           JSONB,
      follow_ups      JSONB,
      type            TEXT NOT NULL DEFAULT 'success',
      result_summary  TEXT,
      created_at      TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_conversations_database ON conversations(database_id, updated_at DESC);
  `);

  // Demo schema tables
  await db.query(`
    CREATE SCHEMA IF NOT EXISTS demo;

    CREATE TABLE IF NOT EXISTS demo.customers (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL UNIQUE,
      country    TEXT NOT NULL,
      plan       TEXT NOT NULL CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS demo.products (
      id       TEXT PRIMARY KEY,
      name     TEXT NOT NULL,
      category TEXT NOT NULL,
      price    NUMERIC(10,2) NOT NULL,
      stock    INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS demo.orders (
      id          TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES demo.customers(id),
      status      TEXT NOT NULL CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
      total       NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS demo.order_items (
      id         TEXT PRIMARY KEY,
      order_id   TEXT NOT NULL REFERENCES demo.orders(id),
      product_id TEXT NOT NULL REFERENCES demo.products(id),
      quantity   INTEGER NOT NULL,
      unit_price NUMERIC(10,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS demo.support_tickets (
      id          TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES demo.customers(id),
      subject     TEXT NOT NULL,
      status      TEXT NOT NULL CHECK (status IN ('open','in_progress','resolved','closed')),
      priority    TEXT NOT NULL CHECK (priority IN ('low','medium','high','urgent')),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      resolved_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_demo_orders_customer   ON demo.orders(customer_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_demo_items_order       ON demo.order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_demo_tickets_customer  ON demo.support_tickets(customer_id, created_at DESC);
  `);

  // Seed demo data once
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM demo.customers LIMIT 1) THEN RETURN; END IF;

      INSERT INTO demo.customers (id, name, email, country, plan, created_at) VALUES
        ('cust-1',  'Alice Johnson',  'alice.j@example.com',   'US', 'pro',        NOW() - INTERVAL '730 days'),
        ('cust-2',  'Bob Smith',      'bob.s@example.com',     'UK', 'starter',    NOW() - INTERVAL '650 days'),
        ('cust-3',  'Carol Williams', 'carol.w@example.com',   'US', 'free',       NOW() - INTERVAL '600 days'),
        ('cust-4',  'David Brown',    'david.b@example.com',   'CA', 'enterprise', NOW() - INTERVAL '580 days'),
        ('cust-5',  'Emma Davis',     'emma.d@example.com',    'AU', 'pro',        NOW() - INTERVAL '520 days'),
        ('cust-6',  'Frank Miller',   'frank.m@example.com',   'DE', 'starter',    NOW() - INTERVAL '490 days'),
        ('cust-7',  'Grace Wilson',   'grace.w@example.com',   'US', 'pro',        NOW() - INTERVAL '460 days'),
        ('cust-8',  'Henry Moore',    'henry.m@example.com',   'FR', 'free',       NOW() - INTERVAL '430 days'),
        ('cust-9',  'Ivy Taylor',     'ivy.t@example.com',     'US', 'enterprise', NOW() - INTERVAL '400 days'),
        ('cust-10', 'James Anderson', 'james.a@example.com',   'JP', 'pro',        NOW() - INTERVAL '365 days'),
        ('cust-11', 'Karen Thomas',   'karen.t@example.com',   'US', 'starter',    NOW() - INTERVAL '330 days'),
        ('cust-12', 'Liam Jackson',   'liam.j@example.com',    'UK', 'pro',        NOW() - INTERVAL '300 days'),
        ('cust-13', 'Mia White',      'mia.w@example.com',     'US', 'free',       NOW() - INTERVAL '270 days'),
        ('cust-14', 'Noah Harris',    'noah.h@example.com',    'CA', 'starter',    NOW() - INTERVAL '240 days'),
        ('cust-15', 'Olivia Martin',  'olivia.m@example.com',  'US', 'pro',        NOW() - INTERVAL '210 days'),
        ('cust-16', 'Peter Garcia',   'peter.g@example.com',   'MX', 'enterprise', NOW() - INTERVAL '180 days'),
        ('cust-17', 'Quinn Lee',      'quinn.l@example.com',   'US', 'pro',        NOW() - INTERVAL '150 days'),
        ('cust-18', 'Rachel Walker',  'rachel.w@example.com',  'AU', 'starter',    NOW() - INTERVAL '120 days'),
        ('cust-19', 'Sam Robinson',   'sam.r@example.com',     'US', 'free',       NOW() - INTERVAL  '90 days'),
        ('cust-20', 'Tina Clark',     'tina.c@example.com',    'SG', 'enterprise', NOW() - INTERVAL  '60 days');

      INSERT INTO demo.products (id, name, category, price, stock) VALUES
        ('prod-1',  'Wireless Headphones',  'Electronics',     79.99,  150),
        ('prod-2',  'Smart Watch',          'Electronics',    199.99,   75),
        ('prod-3',  'Bluetooth Speaker',    'Electronics',     49.99,  200),
        ('prod-4',  'Laptop Stand',         'Electronics',     39.99,  300),
        ('prod-5',  'Running Shoes',        'Sports',          89.99,  120),
        ('prod-6',  'Yoga Mat',             'Sports',          29.99,  250),
        ('prod-7',  'Coffee Maker',         'Home & Garden',   69.99,   80),
        ('prod-8',  'Plant Pot Set',        'Home & Garden',   24.99,  180),
        ('prod-9',  'Python Programming',   'Books',           34.99, 9999),
        ('prod-10', 'Design Patterns',      'Books',           44.99, 9999),
        ('prod-11', 'Organic T-Shirt',      'Clothing',        19.99,  400),
        ('prod-12', 'Winter Jacket',        'Clothing',       129.99,   60);

      INSERT INTO demo.orders (id, customer_id, status, total, created_at)
      SELECT
        'ord-' || i,
        'cust-' || (((i - 1) % 20) + 1),
        (ARRAY['delivered','delivered','delivered','delivered','delivered',
               'shipped','processing','pending','cancelled','delivered'])[((i - 1) % 10) + 1],
        0,
        NOW() - ((730 - i * 9) || ' days')::INTERVAL
      FROM generate_series(1, 80) i;

      INSERT INTO demo.order_items (id, order_id, product_id, quantity, unit_price)
      SELECT
        'item-' || ((i - 1) * 2 + 1),
        'ord-' || i,
        'prod-' || (((i - 1) % 12) + 1),
        ((i - 1) % 3) + 1,
        p.price
      FROM generate_series(1, 80) i
      JOIN demo.products p ON p.id = 'prod-' || (((i - 1) % 12) + 1);

      INSERT INTO demo.order_items (id, order_id, product_id, quantity, unit_price)
      SELECT
        'item-' || ((i - 1) * 2 + 2),
        'ord-' || i,
        'prod-' || (((i + 4) % 12) + 1),
        ((i - 1) % 2) + 1,
        p.price
      FROM generate_series(1, 80) i
      JOIN demo.products p ON p.id = 'prod-' || (((i + 4) % 12) + 1);

      UPDATE demo.orders o
      SET total = (
        SELECT COALESCE(SUM(quantity * unit_price), 0)
        FROM demo.order_items
        WHERE order_id = o.id
      );

      INSERT INTO demo.support_tickets (id, customer_id, subject, status, priority, created_at, resolved_at)
      SELECT
        'tick-' || i,
        'cust-' || (((i - 1) % 20) + 1),
        (ARRAY[
          'Order not received',
          'Billing discrepancy',
          'Product arrived damaged',
          'Account login issue',
          'Refund not processed',
          'Wrong item delivered',
          'Subscription upgrade question',
          'Technical issue with product',
          'Late delivery inquiry',
          'Return request'
        ])[((i - 1) % 10) + 1],
        (ARRAY['open','in_progress','resolved','closed','open','resolved'])[((i - 1) % 6) + 1],
        (ARRAY['low','medium','medium','high','urgent'])[((i - 1) % 5) + 1],
        NOW() - ((180 - (i - 1) * 4) || ' days')::INTERVAL,
        CASE WHEN ((i - 1) % 6) IN (2, 3)
          THEN NOW() - ((180 - (i - 1) * 4 - 3) || ' days')::INTERVAL
          ELSE NULL
        END
      FROM generate_series(1, 40) i;

    END $$;
  `);

  // Register demo connection (once; skip if already exists)
  const appDbUrl = process.env.APP_DATABASE_URL || "postgresql://localhost:5432/querypal";
  await db.query(
    `INSERT INTO connections (id, name, type, connection_string, schema, is_default)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE
       SET connection_string = EXCLUDED.connection_string,
           schema = EXCLUDED.schema`,
    ["demo", "Demo Database", "postgresql", appDbUrl, "demo", true]
  );

  initialized = true;
}
