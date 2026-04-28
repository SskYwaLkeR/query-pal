"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { ConnectionConfig } from "@/types/connection";
import { SchemaInfo } from "@/types/schema";

interface DatabaseContextType {
  databases: ConnectionConfig[];
  selectedDatabaseId: string;
  setSelectedDatabaseId: (id: string) => void;
  loading: boolean;
  schema: SchemaInfo | null;
}

const DatabaseContext = createContext<DatabaseContextType>({
  databases: [],
  selectedDatabaseId: "demo",
  setSelectedDatabaseId: () => {},
  loading: true,
  schema: null,
});

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [databases, setDatabases] = useState<ConnectionConfig[]>([]);
  const [selectedDatabaseId, setSelectedDatabaseIdState] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem("querypal_db") ?? "demo" : "demo")
  );
  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState<SchemaInfo | null>(null);

  const setSelectedDatabaseId = useCallback((id: string) => {
    localStorage.setItem("querypal_db", id);
    setSelectedDatabaseIdState(id);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/connections", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setDatabases(data);
        const stored = localStorage.getItem("querypal_db");
        const stillExists = data.find((d: ConnectionConfig) => d.id === stored);
        if (!stillExists) {
          const def = data.find((d: ConnectionConfig) => d.isDefault);
          if (def) setSelectedDatabaseId(def.id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [setSelectedDatabaseId]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/schema?databaseId=${encodeURIComponent(selectedDatabaseId)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => { if (!data.error) setSchema(data); })
      .catch(() => {});
    return () => controller.abort();
  }, [selectedDatabaseId]);

  return (
    <DatabaseContext.Provider
      value={{
        databases,
        selectedDatabaseId,
        setSelectedDatabaseId,
        loading,
        schema,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}
