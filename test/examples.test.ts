import { describe, it, expect, vi } from "vitest";
import { exampleTools } from "../src/tools/examples.js";

const find = (name: string) => exampleTools.find((t) => t.name === name)!;
function fakeClient(result: unknown = []) {
  return { execute: vi.fn(async () => result) };
}

describe("example tools", () => {
  it("exposes exactly the 4 example tools", () => {
    expect(exampleTools.map((t) => t.name).sort()).toEqual([
      "odoo_low_stock",
      "odoo_overdue_invoices",
      "odoo_sales_summary",
      "odoo_top_customers",
    ]);
  });

  it("overdue_invoices builds the correct AR domain using as_of", async () => {
    const c = fakeClient();
    await find("odoo_overdue_invoices").handler(c as any, { as_of: "2026-06-14" });
    expect(c.execute).toHaveBeenCalledWith(
      "account.move",
      "search_read",
      [
        [
          ["move_type", "=", "out_invoice"],
          ["state", "=", "posted"],
          ["payment_state", "in", ["not_paid", "partial"]],
          ["invoice_date_due", "<", "2026-06-14"],
        ],
      ],
      {
        fields: ["name", "partner_id", "amount_total", "amount_residual", "invoice_date_due"],
        order: "invoice_date_due asc",
        limit: 50,
      },
    );
  });

  it("overdue_invoices appends a partner filter when given", async () => {
    const c = fakeClient();
    await find("odoo_overdue_invoices").handler(c as any, { as_of: "2026-06-14", partner_id: 42 });
    const domain = c.execute.mock.calls[0][2][0] as unknown[];
    expect(domain).toContainEqual(["partner_id", "=", 42]);
  });

  it("sales_summary aggregates via read_group and shapes the result", async () => {
    const c = fakeClient([{ amount_total: 13905.33, __count: 412 }]);
    const out = await find("odoo_sales_summary").handler(c as any, {
      date_from: "2026-05-01",
      date_to: "2026-05-31",
    });
    expect(c.execute).toHaveBeenCalledWith(
      "sale.order",
      "read_group",
      [
        [
          ["date_order", ">=", "2026-05-01 00:00:00"],
          ["date_order", "<=", "2026-05-31 23:59:59"],
          ["state", "in", ["sale", "done"]],
        ],
        ["amount_total:sum"],
        [],
      ],
      { lazy: false },
    );
    expect(out).toEqual({ model: "sale.order", date_from: "2026-05-01", date_to: "2026-05-31", total: 13905.33, order_count: 412 });
  });

  it("sales_summary switches to pos.order when source=pos", async () => {
    const c = fakeClient([{ amount_total: 1, __count: 1 }]);
    await find("odoo_sales_summary").handler(c as any, { date_from: "2026-05-01", date_to: "2026-05-31", source: "pos" });
    expect(c.execute.mock.calls[0][0]).toBe("pos.order");
  });

  it("low_stock builds a storable + qty domain", async () => {
    const c = fakeClient();
    await find("odoo_low_stock").handler(c as any, { threshold: 3 });
    expect(c.execute).toHaveBeenCalledWith(
      "product.product",
      "search_read",
      [
        [
          ["type", "=", "product"],
          ["qty_available", "<=", 3],
        ],
      ],
      { fields: ["display_name", "qty_available", "reordering_min_qty"], order: "qty_available asc", limit: 100 },
    );
  });

  it("top_customers groups by partner, sorts desc and slices", async () => {
    const c = fakeClient([
      { partner_id: [1, "ACME"], amount_total: 500, __count: 2 },
      { partner_id: [2, "Beta"], amount_total: 900, __count: 3 },
      { partner_id: false, amount_total: 100, __count: 1 },
    ]);
    const out = (await find("odoo_top_customers").handler(c as any, {
      date_from: "2026-01-01",
      date_to: "2026-06-30",
      limit: 2,
    })) as any[];
    expect(c.execute.mock.calls[0][1]).toBe("read_group");
    expect(c.execute.mock.calls[0][2][2]).toEqual(["partner_id"]);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ partner_id: 2, partner: "Beta", total: 900, invoice_count: 3 });
    expect(out[1]).toEqual({ partner_id: 1, partner: "ACME", total: 500, invoice_count: 2 });
  });
});
