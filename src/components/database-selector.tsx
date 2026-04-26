"use client";

import { useDatabase } from "@/contexts/database-context";

export function DatabaseSelector() {
  const { databases, selectedDatabaseId, setSelectedDatabaseId } =
    useDatabase();

  if (databases.length <= 1) return null;

  return (
    <select
      value={selectedDatabaseId}
      onChange={(e) => setSelectedDatabaseId(e.target.value)}
      className="h-8 rounded-md border border-input bg-transparent px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
    >
      {databases.map((db) => (
        <option key={db.id} value={db.id}>
          {db.name} ({db.type === "postgresql" ? "PG" : "SQLite"})
        </option>
      ))}
    </select>
  );
}
