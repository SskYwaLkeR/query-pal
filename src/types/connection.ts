export interface ConnectionConfig {
  id: string;
  name: string;
  type: "postgresql";
  connectionString?: string;
  schema?: string;
  isDefault?: boolean;
  createdAt: string;
}
