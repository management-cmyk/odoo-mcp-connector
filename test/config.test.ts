import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config.js";

const base = {
  ODOO_URL: "https://example.odoo.com",
  ODOO_DB: "exampledb",
  ODOO_USERNAME: "user@example.com",
  ODOO_API_KEY: "secret-key-123",
};

describe("loadConfig", () => {
  it("parses a complete env with sane defaults", () => {
    const cfg = loadConfig(base);
    expect(cfg.url).toBe("https://example.odoo.com");
    expect(cfg.db).toBe("exampledb");
    expect(cfg.username).toBe("user@example.com");
    expect(cfg.apiKey).toBe("secret-key-123");
    expect(cfg.enableWrites).toBe(false);
    expect(cfg.timeoutMs).toBe(30000);
  });

  it("throws naming the missing var, without leaking the api key", () => {
    const { ODOO_URL, ...rest } = base;
    expect(() => loadConfig(rest)).toThrow(/ODOO_URL/);
    try {
      loadConfig(rest);
    } catch (e) {
      expect((e as Error).message).not.toContain("secret-key-123");
    }
  });

  it("treats empty/whitespace required vars as missing", () => {
    expect(() => loadConfig({ ...base, ODOO_DB: "   " })).toThrow(/ODOO_DB/);
  });

  it("enables writes only for the exact string 'true'", () => {
    expect(loadConfig({ ...base, ODOO_ENABLE_WRITES: "true" }).enableWrites).toBe(true);
    expect(loadConfig({ ...base, ODOO_ENABLE_WRITES: "TRUE" }).enableWrites).toBe(false);
    expect(loadConfig({ ...base, ODOO_ENABLE_WRITES: "1" }).enableWrites).toBe(false);
    expect(loadConfig({ ...base, ODOO_ENABLE_WRITES: "yes" }).enableWrites).toBe(false);
  });

  it("reads a custom timeout, falling back to 30s on garbage", () => {
    expect(loadConfig({ ...base, ODOO_TIMEOUT_MS: "5000" }).timeoutMs).toBe(5000);
    expect(loadConfig({ ...base, ODOO_TIMEOUT_MS: "abc" }).timeoutMs).toBe(30000);
  });

  it("trims values and strips a trailing slash from the url", () => {
    const cfg = loadConfig({ ...base, ODOO_URL: "https://example.odoo.com/ ", ODOO_USERNAME: "user@example.com\n" });
    expect(cfg.url).toBe("https://example.odoo.com");
    expect(cfg.username).toBe("user@example.com");
  });
});
