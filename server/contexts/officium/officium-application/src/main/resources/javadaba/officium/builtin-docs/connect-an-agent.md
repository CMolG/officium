---
title: "Connect an agent to Officium"
description: "Add Officium Local's MCP server to your AI agent, and give the computer a heartbeat token so its cards stay live."
type: how-to
status: stable
audience:
  - developer
  - end-user
last_updated: 2026-11-08
tags:
  - agents
  - mcp
related:
  - ./live-status.md
  - ./card-fields.md
  - ./documentation.md
---

# Connect an agent to Officium

Connect an AI agent so it can read and write your backlog through Officium Local's MCP server. At the end, the agent works your cards as the local owner, and the board shows live what it is doing.

## Prerequisites

- Officium Local running (`docker compose up -d`), with the API on `http://127.0.0.1:8190` unless you changed `OFFICIUM_API_PORT`.
- An MCP client: Claude Code, Codex CLI, Cursor, VS Code or Claude.

## Steps

### 1. Add the server to your client

Every client connects to the same address, `http://127.0.0.1:8190/officium/mcp`. For Claude Code, run:

```bash
claude mcp add --transport http officium http://127.0.0.1:8190/officium/mcp
```

If you started the server with `OFFICIUM_LOCAL_TOKEN`, the client must send it as a bearer token:

```bash
claude mcp add --transport http officium http://127.0.0.1:8190/officium/mcp \
  --header "Authorization: Bearer $OFFICIUM_LOCAL_TOKEN"
```

Without `OFFICIUM_LOCAL_TOKEN` the server has no authentication and listens on loopback only.

### 2. Check the connection

Ask your agent to list your projects (`projects.list`). It answers with the projects of the local owner.

## Reference

### Credentials

| Credential | What it does |
| --- | --- |
| `OFFICIUM_LOCAL_TOKEN` | When set on the server, every API and MCP request must send it as `Authorization: Bearer <token>` |
| Heartbeat token | Keeps the cards a computer's agent works from lapsing; it has its own check and does not use `OFFICIUM_LOCAL_TOKEN` |

### Features of Officium Cloud

Organizations, billing, GitHub, the changelog, test history, cost telemetry and realtime presence are part of Officium Cloud. Their routes answer `501 feature_unavailable_in_local`.

## Next steps

- [How live status and the heartbeat work](./live-status.md) — what the heartbeat keeps alive, and where you see it.
- [Card fields reference](./card-fields.md) — the fields your agent reads and writes.
- [How documentation works](./documentation.md) — the pages your agent can write.
