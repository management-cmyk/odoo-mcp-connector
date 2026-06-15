# Odoo MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server for **Odoo**. Connect Claude (or any MCP client) to **your own** Odoo ERP and query, report on, and optionally modify your data in natural language.

Works with any Odoo model. **Safe by default: read-only** unless you explicitly enable writes. Your credentials stay on your machine — nothing is stored or sent anywhere except your own Odoo instance.

## Features

- 🔍 **Generic access to any model** — search, read, count, introspect fields, list models
- 📊 **Ready-made business tools** — overdue invoices, sales summary, low-stock products, top customers
- 🔒 **Read-only by default** — create/update/delete only when you opt in (`ODOO_ENABLE_WRITES=true`)
- 🔑 **Your data, your machine** — configured entirely through environment variables

## Install

Add this to your MCP client config (e.g. Claude Desktop or Claude Code):

```json
{
  "mcpServers": {
    "odoo": {
      "command": "npx",
      "args": ["-y", "odoo-mcp-connector"],
      "env": {
        "ODOO_URL": "https://your-company.odoo.com",
        "ODOO_DB": "your-database",
        "ODOO_USERNAME": "you@example.com",
        "ODOO_API_KEY": "your-odoo-api-key"
      }
    }
  }
}
```

### Getting an Odoo API key

In Odoo: **Settings → Users → (your user) → Account Security → New API Key**. Paste the generated key into `ODOO_API_KEY`. (A password also works, but an API key is safer and revocable.)

### Enabling writes

Read-only is the default. To let the model create, update, or delete records, add:

```json
"ODOO_ENABLE_WRITES": "true"
```

> ⚠️ Odoo holds real business data. Enable writes only when you accept that the model can create, modify, or delete records — always within your Odoo user's own permissions.

## Tools

### Always available (read-only)

| Tool | Purpose |
|---|---|
| `odoo_search_read` | Search + read records from any model |
| `odoo_read` | Read records by ID |
| `odoo_count` | Count records matching a domain |
| `odoo_fields` | Introspect a model's fields (name, type, label) |
| `odoo_list_models` | List available models |
| `odoo_overdue_invoices` | Unpaid customer invoices past their due date |
| `odoo_sales_summary` | Revenue + order count over a date range |
| `odoo_low_stock` | Products at/below a quantity threshold |
| `odoo_top_customers` | Top customers by invoiced revenue |

### Only when `ODOO_ENABLE_WRITES=true`

| Tool | Purpose |
|---|---|
| `odoo_create` | Create a record |
| `odoo_write` | Update records by ID |
| `odoo_unlink` | Delete records by ID (irreversible) |
| `odoo_call` | Call an arbitrary model method |

## Configuration reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `ODOO_URL` | yes | — | Your Odoo base URL |
| `ODOO_DB` | yes | — | Database name |
| `ODOO_USERNAME` | yes | — | Login (email) |
| `ODOO_API_KEY` | yes | — | API key (or password) |
| `ODOO_ENABLE_WRITES` | no | `false` | Set `"true"` to allow writes |
| `ODOO_TIMEOUT_MS` | no | `30000` | Per-request timeout (ms) |

## Development

```bash
npm install
npm test       # vitest — fully mocked, no live Odoo needed
npm run build
```

## License

MIT © Falak Sarhan Saade
