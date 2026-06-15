import { z } from "zod";
import type { ToolDef } from "./types.js";

// ───────────────────────── read tools (always registered) ─────────────────────────

const searchRead: ToolDef = {
  name: "odoo_search_read",
  description:
    "Search and read records from any Odoo model in one call. Returns matching records with the requested fields.",
  shape: {
    model: z.string().describe("Model technical name, e.g. 'res.partner', 'sale.order', 'account.move'."),
    domain: z
      .array(z.any())
      .optional()
      .describe('Odoo search domain, e.g. [["is_company","=",true]]. Omit for all records.'),
    fields: z.array(z.string()).optional().describe("Field names to return. Omit for all fields."),
    limit: z.number().int().positive().optional().describe("Max records (default 50)."),
    offset: z.number().int().nonnegative().optional().describe("Records to skip (default 0)."),
    order: z.string().optional().describe("Sort spec, e.g. 'create_date desc'."),
  },
  handler: async (client, { model, domain = [], fields, limit = 50, offset = 0, order }) => {
    const kwargs: Record<string, unknown> = { limit, offset };
    if (fields) kwargs.fields = fields;
    if (order) kwargs.order = order;
    return client.execute(model, "search_read", [domain], kwargs);
  },
};

const read: ToolDef = {
  name: "odoo_read",
  description: "Read specific records by their IDs.",
  shape: {
    model: z.string(),
    ids: z.array(z.number().int()).min(1).describe("Record IDs to read."),
    fields: z.array(z.string()).optional(),
  },
  handler: async (client, { model, ids, fields }) => {
    const kwargs: Record<string, unknown> = {};
    if (fields) kwargs.fields = fields;
    return client.execute(model, "read", [ids], kwargs);
  },
};

const count: ToolDef = {
  name: "odoo_count",
  description: "Count records matching a domain.",
  shape: {
    model: z.string(),
    domain: z.array(z.any()).optional().describe("Search domain. Omit to count all records."),
  },
  handler: async (client, { model, domain = [] }) => client.execute(model, "search_count", [domain]),
};

const fields: ToolDef = {
  name: "odoo_fields",
  description: "Introspect a model's fields — names, types, labels, relations. Useful before querying an unfamiliar model.",
  shape: {
    model: z.string(),
    attributes: z.array(z.string()).optional().describe("Which field attributes to return."),
  },
  handler: async (client, { model, attributes = ["string", "type", "help", "required", "relation"] }) =>
    client.execute(model, "fields_get", [], { attributes }),
};

const listModels: ToolDef = {
  name: "odoo_list_models",
  description: "List available Odoo models, optionally filtered by a substring of the technical name.",
  shape: {
    filter: z.string().optional().describe("Substring to match the model technical name, e.g. 'account'."),
  },
  handler: async (client, { filter }) => {
    const domain = filter ? [["model", "like", filter]] : [];
    return client.execute("ir.model", "search_read", [domain], { fields: ["model", "name"], limit: 200, order: "model" });
  },
};

export const readTools: ToolDef[] = [searchRead, read, count, fields, listModels];

// ───────────────── write tools (registered only when ODOO_ENABLE_WRITES=true) ─────────────────

const create: ToolDef = {
  name: "odoo_create",
  description: "Create a new record. Requires write access (ODOO_ENABLE_WRITES=true).",
  shape: { model: z.string(), values: z.record(z.any()).describe("Field → value map for the new record.") },
  handler: async (client, { model, values }) => client.execute(model, "create", [values]),
};

const write: ToolDef = {
  name: "odoo_write",
  description: "Update existing records by ID. Requires write access.",
  shape: {
    model: z.string(),
    ids: z.array(z.number().int()).min(1),
    values: z.record(z.any()).describe("Field → value map to apply."),
  },
  handler: async (client, { model, ids, values }) => client.execute(model, "write", [ids, values]),
};

const unlink: ToolDef = {
  name: "odoo_unlink",
  description: "Delete records by ID. Requires write access. This is irreversible.",
  shape: { model: z.string(), ids: z.array(z.number().int()).min(1) },
  handler: async (client, { model, ids }) => client.execute(model, "unlink", [ids]),
};

const call: ToolDef = {
  name: "odoo_call",
  description:
    "Call an arbitrary method on a model (escape hatch for anything the other tools don't cover). Requires write access.",
  shape: {
    model: z.string(),
    method: z.string(),
    args: z.array(z.any()).optional(),
    kwargs: z.record(z.any()).optional(),
  },
  handler: async (client, { model, method, args = [], kwargs = {} }) => client.execute(model, method, args, kwargs),
};

export const writeTools: ToolDef[] = [create, write, unlink, call];
