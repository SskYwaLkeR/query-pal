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

interface DatabaseContextType {
  databases: ConnectionConfig[];
  selectedDatabaseId: string;
  setSelectedDatabaseId: (id: string) => void;
  refreshDatabases: () => Promise<void>;
  loading: boolean;
}

const DatabaseContext = createContext<DatabaseContextType>({
  databases: [],
  selectedDatabaseId: "demo",
  setSelectedDatabaseId: () => {},
  refreshDatabases: async () => {},
  loading: true,
});

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [databases, setDatabases] = useState<ConnectionConfig[]>([]);
  const [selectedDatabaseId, setSelectedDatabaseIdState] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem("querypal_db") ?? "demo" : "demo")
  );
  const [loading, setLoading] = useState(true);

  const setSelectedDatabaseId = useCallback((id: string) => {
    localStorage.setItem("querypal_db", id);
    setSelectedDatabaseIdState(id);
  }, []);

  const refreshDatabases = useCallback(async () => {
    try {
      const res = await fetch("/api/connections");
      const data = await res.json();
      if (Array.isArray(data)) {
        setDatabases(data);
        if (!data.find((d: ConnectionConfig) => d.id === selectedDatabaseId)) {
          const defaultDb = data.find((d: ConnectionConfig) => d.isDefault);
          if (defaultDb) setSelectedDatabaseId(defaultDb.id);
        }
      }
    } catch {
      // silently fail, demo will be used
    } finally {
      setLoading(false);
    }
  }, [selectedDatabaseId, setSelectedDatabaseId]);

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

  return (
    <DatabaseContext.Provider
      value={{
        databases,
        selectedDatabaseId,
        setSelectedDatabaseId,
        refreshDatabases,
        loading,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}
