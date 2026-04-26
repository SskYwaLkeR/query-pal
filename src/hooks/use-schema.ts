"use client";

import { useState, useEffect } from "react";
import { SchemaInfo } from "@/types/schema";

export function useSchema(databaseId: string = "demo") {
  const [schema, setSchema] = useState<SchemaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/schema?databaseId=${encodeURIComponent(databaseId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSchema(data);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [databaseId]);

  return { schema, loading, error };
}
