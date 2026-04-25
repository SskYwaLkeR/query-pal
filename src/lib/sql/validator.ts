export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const BLOCKED_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "CREATE",
  "TRUNCATE",
  "REPLACE",
  "ATTACH",
  "DETACH",
  "PRAGMA",
  "GRANT",
  "REVOKE",
  "EXEC",
  "EXECUTE",
];

export function validateSQL(sql: string): ValidationResult {
  const trimmed = sql.trim();
  if (!trimmed) {
    return { valid: false, error: "Empty query." };
  }

  const normalized = trimmed.toUpperCase();

  if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) {
    return {
      valid: false,
      error: "Only SELECT queries are allowed.",
    };
  }

  for (const keyword of BLOCKED_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(trimmed)) {
      return {
        valid: false,
        error: `Forbidden keyword: ${keyword}. Only read-only queries are allowed.`,
      };
    }
  }

  // Check for multiple statements
  const withoutStrings = trimmed
    .replace(/'[^']*'/g, "")
    .replace(/"[^"]*"/g, "");
  const semicolonIdx = withoutStrings.indexOf(";");
  if (
    semicolonIdx !== -1 &&
    withoutStrings.substring(semicolonIdx + 1).trim().length > 0
  ) {
    return {
      valid: false,
      error: "Multiple statements are not allowed.",
    };
  }

  return { valid: true };
}
