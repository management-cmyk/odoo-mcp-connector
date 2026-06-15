export interface OdooConfig {
  url: string;
  db: string;
  username: string;
  apiKey: string;
  enableWrites: boolean;
  timeoutMs: number;
}

const REQUIRED = ["ODOO_URL", "ODOO_DB", "ODOO_USERNAME", "ODOO_API_KEY"] as const;

/**
 * Load and validate Odoo connection config from environment variables.
 * Throws a clear, secret-free error if a required variable is missing.
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): OdooConfig {
  for (const key of REQUIRED) {
    const value = env[key];
    if (!value || value.trim() === "") {
      throw new Error(
        `Missing required env var: ${key}. ` +
          `Set ODOO_URL, ODOO_DB, ODOO_USERNAME and ODOO_API_KEY in your MCP server config.`,
      );
    }
  }

  return {
    url: env.ODOO_URL!.trim().replace(/\/+$/, ""),
    db: env.ODOO_DB!.trim(),
    username: env.ODOO_USERNAME!.trim(),
    apiKey: env.ODOO_API_KEY!.trim(),
    enableWrites: env.ODOO_ENABLE_WRITES === "true",
    timeoutMs: Number(env.ODOO_TIMEOUT_MS) || 30000,
  };
}
