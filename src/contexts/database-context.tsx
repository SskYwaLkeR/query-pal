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
  const [selectedDatabaseId, setSelectedDatabaseId] = useState("demo");
  const [loading, setLoading] = useState(true);

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
  }, [selectedDatabaseId]);

  useEffect(() => {
    refreshDatabases();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
