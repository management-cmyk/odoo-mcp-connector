import type { OdooConfig } from "../config.js";
import type { ToolDef } from "./types.js";
import { readTools, writeTools } from "./core.js";
import { exampleTools } from "./examples.js";

/**
 * Compose the tool set for a given config. Write tools are only included when
 * the user has explicitly opted in via ODOO_ENABLE_WRITES=true.
 */
export function buildToolList(config: OdooConfig): ToolDef[] {
  return [...readTools, ...exampleTools, ...(config.enableWrites ? writeTools : [])];
}

export { readTools, writeTools, exampleTools };
export type { ToolDef };
