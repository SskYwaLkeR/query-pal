"use client";

import { useState, useEffect, useRef } from "react";
import { useDatabase } from "@/contexts/database-context";

export function DatabaseSelector() {
  const { databases, selectedDatabaseId, setSelectedDatabaseId } =
    useDatabase();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (databases.length <= 1) return null;

  const selected = databases.find((db) => db.id === selectedDatabaseId);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-border bg-card/50 hover:bg-card text-xs font-medium transition-colors cursor-pointer"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            selected?.type === "postgresql"
              ? "bg-blue-500"
              : "bg-emerald-500"
          }`}
        />
        {selected?.name || "Select database"}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-52 rounded-xl bg-card border border-border shadow-lg shadow-black/10 py-1 z-50 backdrop-blur-xl">
          {databases.map((db) => (
            <button
              key={db.id}
              onClick={() => {
                setSelectedDatabaseId(db.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
                db.id === selectedDatabaseId
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted/50"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  db.type === "postgresql"
                    ? "bg-blue-500"
                    : "bg-emerald-500"
                }`}
              />
              <span className="truncate">{db.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
