import type { OdooConfig } from "./config.js";

interface JsonRpcResponse {
  jsonrpc?: string;
  id?: number;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
    data?: { message?: string; name?: string; debug?: string };
  };
}

/**
 * Minimal Odoo JSON-RPC client.
 *
 * Talks directly to `<ODOO_URL>/jsonrpc` using the standard two-service flow:
 *   - `common.login`     → authenticate, returns a uid (cached for the process)
 *   - `object.execute_kw` → call any model method
 *
 * The API key is only ever placed in the request body; it never appears in any
 * thrown error message.
 */
export class OdooClient {
  private uid: number | null = null;
  private rpcId = 0;

  constructor(private readonly config: OdooConfig) {}

  async authenticate(): Promise<number> {
    if (this.uid !== null) return this.uid;
    const { db, username, apiKey } = this.config;
    const result = await this.rpc("common", "login", [db, username, apiKey]);
    if (typeof result !== "number" || result === 0) {
      throw new Error("Authentication failed — check ODOO_DB, ODOO_USERNAME and ODOO_API_KEY.");
    }
    this.uid = result;
    return this.uid;
  }

  async execute(
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {},
  ): Promise<unknown> {
    const uid = await this.authenticate();
    return this.rpc(
      "object",
      "execute_kw",
      [this.config.db, uid, this.config.apiKey, model, method, args, kwargs],
      `${model}.${method}`,
    );
  }

  private async rpc(service: string, method: string, args: unknown[], context?: string): Promise<unknown> {
    const host = safeHost(this.config.url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.config.url}/jsonrpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: ++this.rpcId }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Request to ${host} timed out after ${this.config.timeoutMs}ms.`);
      }
      throw new Error(`Network error contacting ${host}: ${(err as Error).message}`);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(`Odoo returned HTTP ${response.status} from ${host}${context ? ` (${context})` : ""}.`);
    }

    const data = (await response.json()) as JsonRpcResponse;
    if (data.error) {
      const detail = data.error.data?.message || data.error.message || "Unknown Odoo error";
      throw new Error(`Odoo error${context ? ` for ${context}` : ""}: ${detail}`);
    }
    return data.result;
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "the Odoo server";
  }
}
