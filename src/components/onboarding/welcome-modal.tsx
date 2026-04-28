"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";

const STORAGE_KEY = "querypal_welcomed";

const EXAMPLE_QUERIES = [
  "How many customers do we have?",
  "What are the top 5 products by revenue?",
  "Show order status breakdown",
  "Which customers have spent the most?",
  "How many open support tickets are there?",
  "Monthly revenue for the past 6 months",
];

const TABLES = ["customers", "orders", "order_items", "products", "support_tickets"];

interface WelcomeModalProps {
  onQuery: (query: string) => void;
}

export function WelcomeModal({ onQuery }: WelcomeModalProps) {
  const shouldShow = useSyncExternalStore(
    () => () => {},
    () => !localStorage.getItem(STORAGE_KEY),
    () => false
  );
  const [dismissed, setDismissed] = useState(false);

  if (!shouldShow || dismissed) return null;

  function dismiss(query?: string) {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
    if (query) onQuery(query);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl border shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center px-8 pt-8 pb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary mb-4 shadow-lg shadow-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-7 h-7">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M8 10h.01M12 10h.01M16 10h.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1.5">Welcome to QueryPal</h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            Ask questions about your data in plain English. No SQL required.
          </p>

          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            {[
              { dot: "bg-emerald-500", label: "Plain English" },
              { dot: "bg-blue-500",    label: "Auto SQL"      },
              { dot: "bg-violet-500",  label: "Visual Charts" },
            ].map(({ dot, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Demo database callout */}
        <div className="mx-6 mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-sm font-medium">Demo database is ready</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            A sample e-commerce dataset is already loaded — explore it now or connect your own database any time.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TABLES.map((t) => (
              <span key={t} className="text-xs font-mono px-2 py-0.5 rounded bg-background border">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Example queries */}
        <div className="px-6 mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
            Try asking
          </p>
          <div className="grid grid-cols-1 gap-2">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => dismiss(q)}
                className="flex items-center gap-2.5 text-sm text-left px-3.5 py-2.5 rounded-lg border border-border/50 bg-card/60 hover:bg-card hover:border-primary/30 hover:shadow-sm transition-all group cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                  <path d="m9 18 6-6-6-6" />
                </svg>
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="px-6 pb-7 space-y-3">
          <button
            onClick={() => dismiss()}
            className="w-full py-2.5 rounded-xl gradient-primary text-white font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            Start exploring
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Have your own database?{" "}
            <Link
              href="/admin"
              onClick={() => dismiss()}
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Connect it here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
