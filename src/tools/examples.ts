import { z } from "zod";
import type { ToolDef } from "./types.js";

// All example tools are read-only and always registered.

const overdueInvoices: ToolDef = {
  name: "odoo_overdue_invoices",
  description: "List unpaid customer invoices past their due date — an instant accounts-receivable / cash-flow view.",
  shape: {
    limit: z.number().int().positive().optional().describe("Max invoices (default 50)."),
    partner_id: z.number().int().optional().describe("Filter to a single customer by partner ID."),
    as_of: z.string().optional().describe("Reference date YYYY-MM-DD for 'overdue' (default: today)."),
  },
  handler: async (client, { limit = 50, partner_id, as_of }) => {
    const today = as_of ?? new Date().toISOString().slice(0, 10);
    const domain: unknown[] = [
      ["move_type", "=", "out_invoice"],
      ["state", "=", "posted"],
      ["payment_state", "in", ["not_paid", "partial"]],
      ["invoice_date_due", "<", today],
    ];
    if (partner_id) domain.push(["partner_id", "=", partner_id]);
    return client.execute("account.move", "search_read", [domain], {
      fields: ["name", "partner_id", "amount_total", "amount_residual", "invoice_date_due"],
      order: "invoice_date_due asc",
      limit,
    });
  },
};

const salesSummary: ToolDef = {
  name: "odoo_sales_summary",
  description: "Total revenue and order count over a date range, from sales orders (default) or POS orders.",
  shape: {
    date_from: z.string().describe("Start date YYYY-MM-DD (inclusive)."),
    date_to: z.string().describe("End date YYYY-MM-DD (inclusive)."),
    source: z.enum(["sale", "pos"]).optional().describe("'sale' = sale.order (default), 'pos' = pos.order."),
  },
  handler: async (client, { date_from, date_to, source = "sale" }) => {
    const model = source === "pos" ? "pos.order" : "sale.order";
    const states = source === "pos" ? ["paid", "done", "invoiced"] : ["sale", "done"];
    const domain = [
      ["date_order", ">=", `${date_from} 00:00:00`],
      ["date_order", "<=", `${date_to} 23:59:59`],
      ["state", "in", states],
    ];
    const groups = (await client.execute(model, "read_group", [domain, ["amount_total:sum"], []], {
      lazy: false,
    })) as Array<Record<string, unknown>>;
    const g = Array.isArray(groups) && groups[0] ? groups[0] : {};
    return {
      model,
      date_from,
      date_to,
      total: (g["amount_total"] as number) ?? 0,
      order_count: (g["__count"] as number) ?? 0,
    };
  },
};

const lowStock: ToolDef = {
  name: "odoo_low_stock",
  description: "List storable products at or below a quantity threshold — restock alerts.",
  shape: {
    threshold: z.number().optional().describe("Flag products with on-hand quantity ≤ this (default 5)."),
    limit: z.number().int().positive().optional().describe("Max products (default 100)."),
  },
  handler: async (client, { threshold = 5, limit = 100 }) => {
    const domain = [
      ["type", "=", "product"],
      ["qty_available", "<=", threshold],
    ];
    return client.execute("product.product", "search_read", [domain], {
      fields: ["display_name", "qty_available", "reordering_min_qty"],
      order: "qty_available asc",
      limit,
    });
  },
};

const topCustomers: ToolDef = {
  name: "odoo_top_customers",
  description: "Top customers ranked by invoiced revenue over a date range.",
  shape: {
    date_from: z.string().describe("Start date YYYY-MM-DD (inclusive)."),
    date_to: z.string().describe("End date YYYY-MM-DD (inclusive)."),
    limit: z.number().int().positive().optional().describe("How many customers to return (default 10)."),
  },
  handler: async (client, { date_from, date_to, limit = 10 }) => {
    const domain = [
      ["move_type", "=", "out_invoice"],
      ["state", "=", "posted"],
      ["invoice_date", ">=", date_from],
      ["invoice_date", "<=", date_to],
    ];
    const groups = (await client.execute("account.move", "read_group", [domain, ["amount_total:sum"], ["partner_id"]], {
      lazy: false,
    })) as Array<Record<string, any>>;
    return (Array.isArray(groups) ? groups : [])
      .map((g) => ({
        partner_id: Array.isArray(g.partner_id) ? g.partner_id[0] : null,
        partner: Array.isArray(g.partner_id) ? g.partner_id[1] : "Unknown",
        total: (g.amount_total as number) ?? 0,
        invoice_count: (g.__count as number) ?? 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  },
};

export const exampleTools: ToolDef[] = [overdueInvoices, salesSummary, lowStock, topCustomers];
