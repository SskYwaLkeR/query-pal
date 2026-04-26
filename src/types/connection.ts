export interface ConnectionConfig {
  id: string;
  name: string;
  type: "sqlite" | "postgresql";
  sqlitePath?: string;
  connectionString?: string;
  isDefault?: boolean;
  createdAt: string;
}
