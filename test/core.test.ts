import { describe, it, expect, vi } from "vitest";
import { readTools, writeTools } from "../src/tools/core.js";

function fakeClient() {
  return { execute: vi.fn(async () => "OK") };
}
const find = (name: string) => [...readTools, ...writeTools].find((t) => t.name === name)!;

describe("read tools", () => {
  it("exposes exactly the 5 read tools", () => {
    expect(readTools.map((t) => t.name).sort()).toEqual([
      "odoo_count",
      "odoo_fields",
      "odoo_list_models",
      "odoo_read",
      "odoo_search_read",
    ]);
  });

  it("search_read wraps the domain and applies default limit/offset", async () => {
    const c = fakeClient();
    await find("odoo_search_read").handler(c as any, {
      model: "res.partner",
      domain: [["is_company", "=", true]],
      fields: ["name"],
    });
    expect(c.execute).toHaveBeenCalledWith("res.partner", "search_read", [[["is_company", "=", true]]], {
      limit: 50,
      offset: 0,
      fields: ["name"],
    });
  });

  it("search_read defaults the domain to []", async () => {
    const c = fakeClient();
    await find("odoo_search_read").handler(c as any, { model: "product.product" });
    expect(c.execute).toHaveBeenCalledWith("product.product", "search_read", [[]], { limit: 50, offset: 0 });
  });

  it("read passes [ids] and fields", async () => {
    const c = fakeClient();
    await find("odoo_read").handler(c as any, { model: "res.partner", ids: [1, 2], fields: ["name", "email"] });
    expect(c.execute).toHaveBeenCalledWith("res.partner", "read", [[1, 2]], { fields: ["name", "email"] });
  });

  it("count uses search_count", async () => {
    const c = fakeClient();
    await find("odoo_count").handler(c as any, { model: "sale.order", domain: [["state", "=", "sale"]] });
    expect(c.execute).toHaveBeenCalledWith("sale.order", "search_count", [[["state", "=", "sale"]]]);
  });

  it("list_models filters via ir.model", async () => {
    const c = fakeClient();
    await find("odoo_list_models").handler(c as any, { filter: "account" });
    expect(c.execute).toHaveBeenCalledWith("ir.model", "search_read", [[["model", "like", "account"]]], {
      fields: ["model", "name"],
      limit: 200,
      order: "model",
    });
  });
});

describe("write tools", () => {
  it("exposes exactly the 4 write tools", () => {
    expect(writeTools.map((t) => t.name).sort()).toEqual(["odoo_call", "odoo_create", "odoo_unlink", "odoo_write"]);
  });

  it("create passes [values]", async () => {
    const c = fakeClient();
    await find("odoo_create").handler(c as any, { model: "res.partner", values: { name: "New Co" } });
    expect(c.execute).toHaveBeenCalledWith("res.partner", "create", [{ name: "New Co" }]);
  });

  it("write passes [ids, values]", async () => {
    const c = fakeClient();
    await find("odoo_write").handler(c as any, { model: "res.partner", ids: [5], values: { phone: "123" } });
    expect(c.execute).toHaveBeenCalledWith("res.partner", "write", [[5], { phone: "123" }]);
  });

  it("unlink passes [ids]", async () => {
    const c = fakeClient();
    await find("odoo_unlink").handler(c as any, { model: "res.partner", ids: [9] });
    expect(c.execute).toHaveBeenCalledWith("res.partner", "unlink", [[9]]);
  });

  it("call forwards method/args/kwargs verbatim", async () => {
    const c = fakeClient();
    await find("odoo_call").handler(c as any, { model: "sale.order", method: "action_confirm", args: [[3]] });
    expect(c.execute).toHaveBeenCalledWith("sale.order", "action_confirm", [[3]], {});
  });
});
