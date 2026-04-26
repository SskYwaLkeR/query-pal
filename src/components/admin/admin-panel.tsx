"use client";

import { useState, useEffect, useCallback } from "react";
import { ConnectionConfig } from "@/types/connection";

type FormData = {
  name: string;
  type: "sqlite" | "postgresql";
  sqlitePath: string;
  connectionString: string;
};

const emptyForm: FormData = {
  name: "",
  type: "sqlite",
  sqlitePath: "",
  connectionString: "",
};

export function AdminPanel() {
  const [connections, setConnections] = useState<ConnectionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [testError, setTestError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/connections");
      const data = await res.json();
      if (Array.isArray(data)) setConnections(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setTestStatus("idle");
    setTestError("");
  }

  function openEdit(conn: ConnectionConfig) {
    setEditingId(conn.id);
    setForm({
      name: conn.name,
      type: conn.type,
      sqlitePath: conn.sqlitePath || "",
      connectionString: conn.connectionString || "",
    });
    setShowForm(true);
    setTestStatus("idle");
    setTestError("");
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setTestStatus("idle");
    setTestError("");
  }

  async function handleTest() {
    setTestStatus("testing");
    setTestError("");
    try {
      const res = await fetch("/api/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          sqlitePath: form.type === "sqlite" ? form.sqlitePath : undefined,
          connectionString:
            form.type === "postgresql" ? form.connectionString : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
        setTestError(data.error || "Connection failed");
      }
    } catch {
      setTestStatus("error");
      setTestError("Network error");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body = {
        name: form.name,
        type: form.type,
        sqlitePath: form.type === "sqlite" ? form.sqlitePath : undefined,
        connectionString:
          form.type === "postgresql" ? form.connectionString : undefined,
      };

      if (editingId) {
        await fetch(`/api/connections/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/connections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      closeForm();
      await fetchConnections();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this connection?")) return;
    await fetch(`/api/connections/${id}`, { method: "DELETE" });
    await fetchConnections();
  }

  const canSave =
    form.name.trim() &&
    (form.type === "sqlite"
      ? form.sqlitePath.trim()
      : form.connectionString.trim());

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"
              title="Back to chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-4 h-4"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </a>
            <h1 className="text-lg font-semibold">Manage Connections</h1>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Connection
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading connections...
          </div>
        ) : connections.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No connections configured. Add one to get started.
          </div>
        ) : (
          connections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center justify-between p-4 rounded-xl border bg-card"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted shrink-0">
                  {conn.type === "postgresql" ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="w-5 h-5 text-blue-500"
                    >
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="w-5 h-5 text-green-500"
                    >
                      <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />
                      <path d="M14 2v5h5" />
                      <path d="M2 15h10M9 18l3-3-3-3" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{conn.name}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      {conn.type === "postgresql" ? "PostgreSQL" : "SQLite"}
                    </span>
                    {conn.isDefault && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {conn.type === "sqlite"
                      ? conn.sqlitePath
                      : conn.connectionString
                        ? conn.connectionString.replace(
                            /\/\/[^:]+:[^@]+@/,
                            "//*****@"
                          )
                        : "No connection string"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-3">
                {conn.isDefault ? (
                  <div
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground"
                    title="Default connection cannot be deleted"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="w-4 h-4"
                    >
                      <rect
                        width="18"
                        height="11"
                        x="3"
                        y="11"
                        rx="2"
                        ry="2"
                      />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => openEdit(conn)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="w-4 h-4"
                      >
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(conn.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="w-4 h-4"
                      >
                        <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background rounded-2xl border shadow-lg w-full max-w-lg mx-4 p-6 space-y-4">
              <h2 className="text-lg font-semibold">
                {editingId ? "Edit Connection" : "New Connection"}
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="My Database"
                    className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setForm({ ...form, type: "sqlite" })
                      }
                      className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                        form.type === "sqlite"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input hover:bg-muted"
                      }`}
                    >
                      SQLite
                    </button>
                    <button
                      onClick={() =>
                        setForm({ ...form, type: "postgresql" })
                      }
                      className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                        form.type === "postgresql"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input hover:bg-muted"
                      }`}
                    >
                      PostgreSQL
                    </button>
                  </div>
                </div>

                {form.type === "sqlite" ? (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      File Path
                    </label>
                    <input
                      type="text"
                      value={form.sqlitePath}
                      onChange={(e) =>
                        setForm({ ...form, sqlitePath: e.target.value })
                      }
                      placeholder="/path/to/database.db"
                      className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Connection String
                    </label>
                    <input
                      type="text"
                      value={form.connectionString}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          connectionString: e.target.value,
                        })
                      }
                      placeholder="postgresql://user:pass@localhost:5432/mydb"
                      className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTest}
                  disabled={testStatus === "testing" || !canSave}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {testStatus === "testing" ? (
                    <>
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </button>
                {testStatus === "success" && (
                  <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Connected
                  </span>
                )}
                {testStatus === "error" && (
                  <span className="text-sm text-red-600 dark:text-red-400">
                    {testError}
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  onClick={closeForm}
                  className="px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!canSave || saving}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
