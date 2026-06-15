import { describe, it, expect } from "vitest";
import { buildToolList } from "../src/tools/index.js";
import type { OdooConfig } from "../src/config.js";

const cfg = (enableWrites: boolean): OdooConfig => ({
  url: "https://e.odoo.com",
  db: "d",
  username: "u",
  apiKey: "k",
  enableWrites,
  timeoutMs: 30000,
});

describe("buildToolList (write gating)", () => {
  it("registers read + example tools and NO write tools when writes disabled", () => {
    const names = buildToolList(cfg(false)).map((t) => t.name);
    expect(names).toContain("odoo_search_read");
    expect(names).toContain("odoo_overdue_invoices");
    expect(names).not.toContain("odoo_create");
    expect(names).not.toContain("odoo_unlink");
  });

  it("adds the 4 write tools when writes enabled", () => {
    const names = buildToolList(cfg(true)).map((t) => t.name);
    for (const w of ["odoo_create", "odoo_write", "odoo_unlink", "odoo_call"]) {
      expect(names).toContain(w);
    }
  });

  it("never produces duplicate tool names", () => {
    const names = buildToolList(cfg(true)).map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
