import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function seedDatabase() {
  const dbDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const dbPath = path.join(dbDir, "demo.db");
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const rand = seededRandom(42);
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const randInt = (min: number, max: number) =>
    Math.floor(rand() * (max - min + 1)) + min;
  const randDate = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return new Date(s + rand() * (e - s)).toISOString().split("T")[0];
  };

  db.exec(`
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      country TEXT NOT NULL,
      plan_type TEXT NOT NULL,
      signup_date TEXT NOT NULL,
      industry TEXT NOT NULL
    );

    CREATE TABLE subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      plan TEXT NOT NULL,
      status TEXT NOT NULL,
      mrr REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT
    );

    CREATE TABLE invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      due_date TEXT NOT NULL,
      paid_date TEXT
    );

    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL
    );

    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      order_date TEXT NOT NULL
    );

    CREATE TABLE support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      subject TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );
  `);

  // Countries with weighted distribution
  const countries = [
    "US", "US", "US", "US", "US", "US",
    "UK", "UK", "UK",
    "Brazil", "Brazil",
    "Germany", "Germany",
    "India", "India",
    "Canada",
    "Australia",
    "Japan",
    "France",
    "Singapore",
  ];
  const plans = ["free", "starter", "professional", "enterprise"];
  const industries = [
    "SaaS",
    "E-commerce",
    "Healthcare",
    "Finance",
    "Education",
    "Media",
  ];
  const mrrByPlan: Record<string, [number, number]> = {
    free: [0, 0],
    starter: [29, 49],
    professional: [99, 199],
    enterprise: [499, 999],
  };

  const companyPrefixes = [
    "Acme", "Vertex", "Zenith", "Nova", "Pulse", "Apex",
    "Orbit", "Nexus", "Flux", "Prism", "Atlas", "Vortex",
    "Spark", "Helix", "Crest", "Ember", "Drift", "Swift",
    "Lunar", "Solar", "Coral", "Maple", "Cedar", "Ridge",
    "Storm", "Tide", "Echo", "Forge", "Haven", "Slate",
  ];
  const companySuffixes = [
    "Corp", "Inc", "Labs", "Tech", "IO", "Systems",
    "Digital", "Solutions", "AI", "Group", "HQ", "Co",
  ];

  const insertCustomer = db.prepare(`
    INSERT INTO customers (name, email, country, plan_type, signup_date, industry)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const customerIds: number[] = [];

  // Seed 150 customers with patterns
  db.transaction(() => {
    for (let i = 0; i < 150; i++) {
      const prefix = companyPrefixes[i % companyPrefixes.length];
      const suffix = pick(companySuffixes);
      const name = `${prefix} ${suffix}`;
      const email = `contact@${prefix.toLowerCase()}${i}.com`;

      let country: string;
      // Brazil spike: extra signups in early 2025
      if (i >= 130 && i < 145) {
        country = "Brazil";
      } else {
        country = pick(countries);
      }

      let plan: string;
      // Enterprise customers are fewer but exist
      if (i < 10) plan = "enterprise";
      else if (i < 35) plan = "professional";
      else if (i < 80) plan = "starter";
      else plan = "free";

      // Seasonal pattern: more signups in Q1
      let signupDate: string;
      if (i >= 130 && i < 145) {
        // Brazil spike: March 2025
        signupDate = randDate("2025-03-01", "2025-03-28");
      } else if (rand() < 0.3) {
        signupDate = randDate("2025-01-01", "2025-03-28");
      } else if (rand() < 0.4) {
        signupDate = randDate("2024-07-01", "2024-12-31");
      } else {
        signupDate = randDate("2023-01-01", "2024-06-30");
      }

      const industry = pick(industries);

      const result = insertCustomer.run(
        name, email, country, plan, signupDate, industry
      );
      customerIds.push(Number(result.lastInsertRowid));
    }
  })();

  // Seed subscriptions with churn patterns
  const insertSub = db.prepare(`
    INSERT INTO subscriptions (customer_id, plan, status, mrr, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const customers = db.prepare("SELECT * FROM customers").all() as Array<{
    id: number;
    plan_type: string;
    signup_date: string;
    country: string;
  }>;

  db.transaction(() => {
    for (const c of customers) {
      const [minMrr, maxMrr] = mrrByPlan[c.plan_type];
      const mrr = minMrr === maxMrr ? minMrr : randInt(minMrr, maxMrr);

      // Enterprise churns less (5%), others more (15-25%)
      let status: string;
      const churnChance =
        c.plan_type === "enterprise"
          ? 0.05
          : c.plan_type === "professional"
            ? 0.1
            : c.plan_type === "starter"
              ? 0.15
              : 0.25;

      if (c.plan_type === "free") {
        status = rand() < 0.7 ? "active" : rand() < 0.5 ? "trial" : "churned";
      } else if (rand() < churnChance) {
        status = "churned";
      } else if (rand() < 0.05) {
        status = "paused";
      } else {
        status = "active";
      }

      const endDate =
        status === "churned"
          ? randDate(c.signup_date, "2025-03-28")
          : null;

      insertSub.run(
        c.id, c.plan_type, status, mrr, c.signup_date, endDate
      );

      // Some customers have a second subscription (upgraded)
      if (rand() < 0.15 && c.plan_type !== "enterprise") {
        const upgradePlan =
          c.plan_type === "free"
            ? "starter"
            : c.plan_type === "starter"
              ? "professional"
              : "enterprise";
        const [uMin, uMax] = mrrByPlan[upgradePlan];
        insertSub.run(
          c.id,
          upgradePlan,
          "active",
          randInt(uMin, uMax),
          randDate(c.signup_date, "2025-03-28"),
          null
        );
      }
    }
  })();

  // Seed products
  const productData = [
    ["QueryPal Basic", "Analytics", 29],
    ["QueryPal Pro", "Analytics", 99],
    ["QueryPal Enterprise", "Analytics", 499],
    ["Data Connector - Postgres", "Integration", 19],
    ["Data Connector - MySQL", "Integration", 19],
    ["Data Connector - BigQuery", "Integration", 39],
    ["Data Connector - Snowflake", "Integration", 49],
    ["API Access - Standard", "API", 49],
    ["API Access - Premium", "API", 149],
    ["API Access - Unlimited", "API", 299],
    ["Priority Support - Monthly", "Support", 99],
    ["Priority Support - Annual", "Support", 899],
    ["Dedicated Success Manager", "Support", 299],
    ["Onboarding Workshop", "Training", 499],
    ["Advanced SQL Training", "Training", 199],
    ["Custom Dashboard Setup", "Training", 349],
    ["Data Migration Service", "Integration", 599],
    ["SSO Integration", "Integration", 149],
    ["Audit Log Add-on", "Analytics", 79],
    ["White-label Reports", "Analytics", 199],
  ];

  const insertProduct = db.prepare(
    "INSERT INTO products (name, category, price) VALUES (?, ?, ?)"
  );
  db.transaction(() => {
    for (const [name, category, price] of productData) {
      insertProduct.run(name, category, price);
    }
  })();

  // Seed orders
  const insertOrder = db.prepare(`
    INSERT INTO orders (customer_id, product_id, quantity, total_amount, order_date)
    VALUES (?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (let i = 0; i < 400; i++) {
      const customerId = pick(customerIds);
      const productId = randInt(1, 20);
      const product = productData[productId - 1];
      const quantity = randInt(1, 5);
      const totalAmount = (product[2] as number) * quantity;
      const orderDate = randDate("2023-06-01", "2025-03-28");
      insertOrder.run(customerId, productId, quantity, totalAmount, orderDate);
    }
  })();

  // Seed invoices
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (customer_id, amount, status, due_date, paid_date)
    VALUES (?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (let i = 0; i < 500; i++) {
      const customerId = pick(customerIds);
      const amount = randInt(29, 2000);
      const dueDate = randDate("2023-06-01", "2025-04-30");

      let status: string;
      let paidDate: string | null = null;
      const r = rand();
      if (r < 0.65) {
        status = "paid";
        const dueDateObj = new Date(dueDate);
        const offset = randInt(-5, 15);
        const paidDateObj = new Date(
          dueDateObj.getTime() + offset * 86400000
        );
        paidDate = paidDateObj.toISOString().split("T")[0];
      } else if (r < 0.82) {
        status = "pending";
      } else if (r < 0.95) {
        status = "overdue";
      } else {
        status = "void";
      }

      insertInvoice.run(customerId, amount, status, dueDate, paidDate);
    }
  })();

  // Seed support tickets — more tickets for churned customers
  const insertTicket = db.prepare(`
    INSERT INTO support_tickets (customer_id, subject, status, priority, created_at, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const ticketSubjects = [
    "Cannot connect to database",
    "Query timeout issue",
    "Dashboard not loading",
    "Export feature broken",
    "Need help with JOIN queries",
    "API rate limit exceeded",
    "Billing discrepancy",
    "Feature request: dark mode",
    "Data sync delay",
    "Permission error on shared dashboard",
    "Chart rendering incorrectly",
    "SSO login failure",
    "Slow query performance",
    "Missing data in reports",
    "Account upgrade request",
  ];

  const ticketStatuses = ["open", "in_progress", "resolved", "closed"];
  const priorities = ["low", "medium", "high", "critical"];

  // Get churned customer IDs for correlation
  const churnedIds = new Set(
    (
      db
        .prepare("SELECT customer_id FROM subscriptions WHERE status = 'churned'")
        .all() as Array<{ customer_id: number }>
    ).map((r) => r.customer_id)
  );

  db.transaction(() => {
    for (let i = 0; i < 300; i++) {
      // Churned customers generate more tickets (correlation)
      let customerId: number;
      if (rand() < 0.4 && churnedIds.size > 0) {
        customerId = pick([...churnedIds]);
      } else {
        customerId = pick(customerIds);
      }

      const subject = pick(ticketSubjects);
      const createdAt = randDate("2023-06-01", "2025-03-28");

      let status: string;
      let priority: string;
      let resolvedAt: string | null = null;

      // Enterprise customers get higher priority
      const customer = customers.find((c) => c.id === customerId);
      if (customer?.plan_type === "enterprise") {
        priority = rand() < 0.5 ? "critical" : "high";
      } else {
        priority = pick(priorities);
      }

      const sr = rand();
      if (sr < 0.35) {
        status = "resolved";
        const created = new Date(createdAt);
        resolvedAt = new Date(
          created.getTime() + randInt(1, 14) * 86400000
        )
          .toISOString()
          .split("T")[0];
      } else if (sr < 0.6) {
        status = "closed";
        const created = new Date(createdAt);
        resolvedAt = new Date(
          created.getTime() + randInt(1, 30) * 86400000
        )
          .toISOString()
          .split("T")[0];
      } else if (sr < 0.8) {
        status = "in_progress";
      } else {
        status = "open";
      }

      insertTicket.run(
        customerId,
        subject,
        status,
        priority,
        createdAt,
        resolvedAt
      );
    }
  })();

  db.close();
  console.log(`Database seeded at ${dbPath}`);
}
