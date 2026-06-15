#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { OdooClient } from "./odoo-client.js";
import { buildToolList } from "./tools/index.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new OdooClient(config);
  const tools = buildToolList(config);

  const server = new McpServer({ name: "odoo-mcp-server", version: "0.1.0" });

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.shape },
      async (input: Record<string, unknown>) => {
        try {
          const result = await tool.handler(client, input);
          return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
        } catch (err) {
          return {
            content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
            isError: true,
          };
        }
      },
    );
  }

  await server.connect(new StdioServerTransport());

  // stdout is the JSON-RPC channel; log only to stderr.
  console.error(
    `odoo-mcp-server ready — ${tools.length} tools, writes ${config.enableWrites ? "ENABLED" : "disabled"}.`,
  );
}

main().catch((err) => {
  console.error(`Fatal: ${(err as Error).message}`);
  process.exit(1);
});
