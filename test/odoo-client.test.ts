import { describe, it, expect, vi, afterEach } from "vitest";
import { OdooClient } from "../src/odoo-client.js";
import type { OdooConfig } from "../src/config.js";

const config: OdooConfig = {
  url: "https://example.odoo.com",
  db: "exampledb",
  username: "user@example.com",
  apiKey: "secret-key-123",
  enableWrites: false,
  timeoutMs: 30000,
};

function rpcResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

afterEach(() => vi.unstubAllGlobals());

describe("OdooClient", () => {
  it("authenticate posts common.login and caches the uid", async () => {
    const fetchMock = vi.fn().mockResolvedValue(rpcResponse({ jsonrpc: "2.0", id: 1, result: 7 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new OdooClient(config);
    expect(await client.authenticate()).toBe(7);
    await client.authenticate(); // cached
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.odoo.com/jsonrpc");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.params.service).toBe("common");
    expect(body.params.method).toBe("login");
    expect(body.params.args).toEqual(["exampledb", "user@example.com", "secret-key-123"]);
  });

  it("throws a secret-free error when login returns falsy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(rpcResponse({ result: false })));
    const client = new OdooClient(config);
    await expect(client.authenticate()).rejects.toThrow(/Authentication failed/);
    await client.authenticate().catch((e: Error) => {
      expect(e.message).not.toContain("secret-key-123");
    });
  });

  it("execute authenticates once then posts object.execute_kw in the correct arg order", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(rpcResponse({ result: 7 }))
      .mockResolvedValueOnce(rpcResponse({ result: [{ id: 1, name: "ACME" }] }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new OdooClient(config);
    const res = await client.execute("res.partner", "search_read", [[]], { fields: ["name"], limit: 5 });
    expect(res).toEqual([{ id: 1, name: "ACME" }]);

    const body = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect(body.params.service).toBe("object");
    expect(body.params.method).toBe("execute_kw");
    expect(body.params.args).toEqual([
      "exampledb",
      7,
      "secret-key-123",
      "res.partner",
      "search_read",
      [[]],
      { fields: ["name"], limit: 5 },
    ]);
  });

  it("surfaces an Odoo error naming the model.method, never the api key", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(rpcResponse({ result: 7 }))
      .mockResolvedValueOnce(
        rpcResponse({ error: { code: 200, message: "Server Error", data: { message: "Object res.bogus doesn't exist" } } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = new OdooClient(config);
    await client.execute("res.bogus", "search_read", [[]]).catch((e: Error) => {
      expect(e.message).toMatch(/res\.bogus\.search_read/);
      expect(e.message).toContain("doesn't exist");
      expect(e.message).not.toContain("secret-key-123");
    });
    expect.assertions(3);
  });

  it("maps an abort into a timeout error naming the host, not the key", async () => {
    const fetchMock = vi.fn().mockImplementation((_url, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        (init.signal as AbortSignal).addEventListener("abort", () => {
          const err = new Error("Aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new OdooClient({ ...config, timeoutMs: 10 });
    await client.authenticate().catch((e: Error) => {
      expect(e.message).toMatch(/timed out/i);
      expect(e.message).toContain("example.odoo.com");
      expect(e.message).not.toContain("secret-key-123");
    });
    expect.assertions(3);
  });
});
