import type { z } from "zod";
import type { OdooClient } from "../odoo-client.js";

/**
 * A self-contained MCP tool: its name, model-facing description, the Zod raw
 * shape used for input validation + JSON-schema generation, and a handler that
 * receives the connected Odoo client and the validated input.
 */
export interface ToolDef {
  name: string;
  description: string;
  shape: z.ZodRawShape;
  handler: (client: OdooClient, input: any) => Promise<unknown>;
}
