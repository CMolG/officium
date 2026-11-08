# Officium

**A backlog you and your AI agents work on together, on the same board.**

Every card your agents create or update shows up on the board the moment it happens, and every
change you make is just as visible to them. When an agent runs into something only you can do, it
hands it back as a card in your **Needs You** lane instead of a comment buried in a chat.

This repository is **Officium Local**: the free, self-hosted edition for one person on one
machine. It runs entirely on your computer with Docker. **[Officium Cloud](https://javadaba.com/officium)**
is the hosted edition for teams.

## Quick start

You need Docker.

```sh
git clone https://github.com/CMolG/officium.git
cd officium
docker compose up -d --build
```

- Board: <http://127.0.0.1:3190>
- MCP endpoint for your agents: `http://127.0.0.1:8190/officium/mcp`

Connect Claude Code:

```sh
claude mcp add --transport http officium http://127.0.0.1:8190/officium/mcp
```

Then ask your agent for the next card. It discovers the operations with `discover` and runs them
with `query`, for example `cards.next`, `cards.move` or `cards.search`.

Everything listens on `127.0.0.1` only. To require a token, set `OFFICIUM_LOCAL_TOKEN` before
`docker compose up`; agents then send `Authorization: Bearer <token>`.

## What Officium Local gives you

- **One board for people and agents.** Projects, cards, epics and sprints, with a status
  workflow whose transitions carry contracts (a card cannot reach Review without what Review needs).
- **Work an agent can pick up on its own.** `cards.next` hands an agent the next card it should
  work, respecting priorities and blockers.
- **Epics as checkpoints.** An agent can work a whole epic in one session, checkpoint by
  checkpoint, so long work stays inside what models do reliably.
- **Review that says why.** A card sent back from Review carries its reasons from a closed list
  (tests missing, acceptance unmet, plan not followed...), so the next attempt knows what to fix.
- **Needs You.** Cards that only a person can resolve wait in their own lane until you answer.
- **Roles.** A role matrix decides which agent role refines, builds and reviews each kind of card.
- **Docs next to the work.** A documentation tree with pages, search and history.

## Local or Cloud

| | Local | Cloud |
| --- | :---: | :---: |
| Board, cards, epics, sprints, workflow contracts | ✓ | ✓ |
| MCP server for agents (`cards.next`, review send-backs, Needs You) | ✓ | ✓ |
| Epic checkpoints, role matrix, docs | ✓ | ✓ |
| Runs on your machine, your data stays there | ✓ | |
| Teams: organizations, members, invitations and sharing | | ✓ |
| One account across devices, nothing to host or back up | | ✓ |
| Real-time presence and collaborative editing of docs | | ✓ |
| Email notifications, and forms to answer Needs You cards | | ✓ |
| GitHub integration and a CI integration gate | | ✓ |
| Changelog and test history from your pipeline | | ✓ |
| Usage, cost and time reports | | ✓ |
| Queue cards from the board straight into a running agent window | | ✓ |

Cloud features appear in Local with an **Officium Cloud** label, so you can see what they are.
Nothing in Local nags you to upgrade.

**[Try Officium Cloud](https://javadaba.com/officium)**

## Officium and Fluxor

Officium tracks the work. **[Fluxor](https://github.com/CMolG/fluxor)** gives your agents the
rules, skills and hooks they work with, including the `autoloop` skill that runs several agents in
parallel on Officium's backlog, each in its own git worktree.

## Background

Officium implements the operating model of FIERCE, a framework for software development where
agents do the implementation and a few experts hold the decisions:

> Molina Galindo, C. (2026). *FIERCE: Fast Implementation Ensuring Results by Capable Experts.*
> [doi:10.5281/zenodo.23972303](https://doi.org/10.5281/zenodo.23972303)

## Repository layout

- `server/`: the API (Java, Quarkus): REST under `/officium/v1` and MCP under `/officium/mcp`.
- `web/`: the board (Next.js), built in its Local edition.
- `docker-compose.yml`: PostgreSQL, the API and the web, all bound to `127.0.0.1`.
- `scripts/smoke.sh`: an end-to-end check against a running stack.

This repository is published from the private monorepo where Officium is developed. Issues are
welcome; pull requests are ported by hand.

## License

[Elastic License 2.0](LICENSE). You may use, modify and self-host Officium for your own work and
your company's. You may not offer it to third parties as a hosted or managed service. See
[NOTICE](NOTICE).
