import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { ConnectionConfig } from "@/types/connection";

const REGISTRY_PATH = path.join(process.cwd(), "data", "connections.json");

function ensureDataDir() {
  const dir = path.dirname(REGISTRY_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadConnections(): ConnectionConfig[] {
  ensureDataDir();
  if (!fs.existsSync(REGISTRY_PATH)) {
    const defaults = [createDefaultConnection()];
    saveConnections(defaults);
    return defaults;
  }
  const raw = fs.readFileSync(REGISTRY_PATH, "utf-8");
  const configs: ConnectionConfig[] = JSON.parse(raw);
  if (!configs.find((c) => c.id === "demo")) {
    configs.unshift(createDefaultConnection());
    saveConnections(configs);
  }
  return configs;
}

export function saveConnections(configs: ConnectionConfig[]): void {
  ensureDataDir();
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(configs, null, 2));
}

export function getConnection(id: string): ConnectionConfig | null {
  return loadConnections().find((c) => c.id === id) ?? null;
}

export function addConnection(
  config: Omit<ConnectionConfig, "id" | "createdAt">
): ConnectionConfig {
  const connections = loadConnections();
  const newConfig: ConnectionConfig = {
    ...config,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  connections.push(newConfig);
  saveConnections(connections);
  return newConfig;
}

export function updateConnection(
  id: string,
  updates: Partial<Omit<ConnectionConfig, "id" | "createdAt">>
): ConnectionConfig {
  const connections = loadConnections();
  const idx = connections.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error(`Connection ${id} not found`);
  connections[idx] = { ...connections[idx], ...updates };
  saveConnections(connections);
  return connections[idx];
}

export function deleteConnection(id: string): void {
  const connections = loadConnections();
  const target = connections.find((c) => c.id === id);
  if (!target) throw new Error(`Connection ${id} not found`);
  if (target.isDefault) throw new Error("Cannot delete the default connection");
  saveConnections(connections.filter((c) => c.id !== id));
}

function createDefaultConnection(): ConnectionConfig {
  return {
    id: "demo",
    name: "Demo Database",
    type: "sqlite",
    sqlitePath: "data/demo.db",
    isDefault: true,
    createdAt: new Date().toISOString(),
  };
}
