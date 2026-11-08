---
title: "Card fields reference"
description: "Look up every field of an Officium card as the board and the MCP server return it: its type, whether it is required, its default and what it means."
type: reference
status: stable
audience:
  - developer
  - end-user
last_updated: 2026-10-26
tags:
  - cards
  - reference
related:
  - ./card-lifecycle.md
  - ./ai-and-human-cards.md
  - ./categories.md
  - ./connect-an-agent.md
---

# Card fields reference

Every field of a card, as `cards.get` returns it over the MCP server and the REST API. Use it when you write cards from an agent or read them from a script.

## Examples

### Create a card from an agent

Only `title` is required. This `query` call creates a card in the project's backlog, ready to be refined:

```json
{
  "operation": "cards.create",
  "params": {
    "projectId": "<PROJECT_ID>",
    "title": "Show the delivery date on the order page",
    "description": "Customers ask support when their order arrives.",
    "category": "feature",
    "priority": "high",
    "signals": ["touches-ui"],
    "clientKey": "order-delivery-date"
  }
}
```

Replace `<PROJECT_ID>` with the project's id from `projects.list`. Sending the same `clientKey` again returns the first card instead of a duplicate.

### Change a field

Every write carries the version you read. This call sets the category and leaves every other field as it is:

```json
{
  "operation": "cards.update",
  "params": {
    "projectId": "<PROJECT_ID>",
    "cardId": "<CARD_ID>",
    "expectedVersion": 4,
    "category": "bug"
  }
}
```

Replace `<CARD_ID>` with the card's `id`. A field left out is unchanged. An empty string clears `description`, `actionPlan`, `epic` and `category`, and an empty list clears `tags`, `signals` and, on an AI card, `assignees`. A blank `title` is refused with `title_required`, and an empty `assignees` on a human card with `human_card_needs_assignee`, because a human card always has someone on it. `priority` and `estimate` always hold a value: you change them, never clear them. An agent changes the title or description of an AI feature, bug, hotfix or regression card only while it is in Refine; past it the change is refused with `contract_unmet`, except for ticking checklist boxes.

### What a write answers over MCP

A write answers the card's `id`, `projectId`, `key`, `status`, `version` and `updatedAt`, plus what the write produced (the new links, the sprint, the comment or time entry id). It does not repeat the description or the action plan. `cards.get` answers the whole card with its last 3 comments and `omitted` counts for the rest; `cards.next` answers the card without `description` and `actionPlan`. Pass `"view": "full"` to any of them for the answer as it was before.

## Reference

### Fields you write

`cards.create` takes every field in this table. Once the card exists, the **Changed with** column names the operation that writes each one: `cards.update` writes only its own fields, and the rest have an operation each.

| Name | Type | Required | Default | Changed with | Description |
| --- | --- | --- | --- | --- | --- |
| `title` | `string` | Yes | — | `cards.update` | The card's name, trimmed; a blank title is refused. |
| `actionPlan` | `string` | No | `""` | `cards.update` | How the card will be done, in Markdown, apart from the request. |
| `assignees` | `array` | No | `[]` | `cards.update` | People on the card, each with a `name`; a human card gets the owner when created with none. |
| `blocks` | `string[]` | No | `[]` | `cards.link`, `cards.unlink` | Keys of the cards this card blocks. |
| `category` | `string` | No | `null` | `cards.update` | The kind of work, one of the category values below. |
| `description` | `string` | No | `null` | `cards.update` | What the card asks for and why, in Markdown. |
| `epic` | `string` | No | `null` | `cards.update` | The epic it belongs to: the epic card's key or its label. |
| `estimate` | `number` | No | `0` | `cards.update` | Estimated hours. |
| `executor` | `string` | No | `ai` | `cards.setExecutor` | Who does the work: `ai` or `human`. |
| `priority` | `string` | No | `medium` | `cards.update` | How urgent it is, one of the priority values below. |
| `related` | `string[]` | No | `[]` | `cards.link`, `cards.unlink` | Keys of related cards; the link shows on both cards. |
| `signals` | `string[]` | No | `[]` | `cards.update` | What the work touches, from the signal values below. |
| `sprintId` | `string` | No | `null` | `cards.setSprint` | The sprint it is planned into; `null` is the backlog. |
| `status` | `string` | No | `refine` | `cards.move` | Its status; a `routine` card starts in `todo`. |
| `subtype` | `string` | No | `null` | `cards.update` | A spike's kind, `technical` or `ux-ui`; any other category refuses one with `subtype_not_allowed`. |
| `tags` | `string[]` | No | `[]` | `cards.update` | Free labels for filtering. |

### Fields Officium sets

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `blocked` | `boolean` | No | `false` | True while `blockedBy` is not empty. |
| `blockedBy` | `string[]` | No | `[]` | Keys of the cards that block this one now: a blocker in `deploy` or `done` no longer blocks and moves to `relatedBy`; a `rejected` one still blocks. `blocks` is the same list from the blocker's side. |
| `relatedBy` | `{key, direction}[]` | No | `[]` | Cards joined to this one by a `blocks` link whose blocker finished. `direction` is `blockedThis` (that card was the blocker) or `blockedByThis` (this card was). Derived on read: a blocker sent back to an open status blocks again. Remove one with `cards.unlink` type `blocks`. |
| `eligibleRoles` | `string[]` | No | `[]` | The roles that may work the card now, from its category, phase and signals. |
| `excerpt` | `string` | No | — | The description's first 160 characters, as plain text. |
| `humanEditPending` | `boolean` | No | `false` | True when a person changed the card and no agent has acknowledged it. |
| `key` | `string` | No | — | The project's prefix and the card's number, like `OFF-12`. |
| `order` | `integer` | No | — | Its position in its column, from 0. |
| `phase` | `string` | No | — | The phase its status belongs to; `null` once completed or rejected. |
| `rank` | `integer` | No | — | Its position in its sprint, or in the backlog. |
| `reviewReturns` | `{id, at, by, role, from, to, reasons, commentId}[]` | No | `[]` | Each time the card was sent back from review or deploy to a work phase, oldest first: when (`at`), who (`by`) and the role they reviewed as (`role`, `null` for a person who gave none), the statuses it went `from` and `to`, the `reasons` from the closed list (`acceptance-unmet`, `contract-unmet`, `tests-missing-or-red`, `plan-not-followed`, `regression`, `design-or-ux`, `scope-drift`, `integration-failed`, `other`), and the `commentId` of the findings comment (`null` once it is deleted). Written by `cards.move` with a `reviewReturn`; never edited. |
| `reviewRework` | `{streak, cap}` | No | `{streak: 0, cap: 3}` | The send-backs from review since the plan was last redone (`streak`) against the cap (`cap`, card://JAVA-1443). The send-back that reaches the cap lands in `refine` with an escalation in its findings, and a move into review while the streak is at the cap answers `review_rework_cap`. Derived from `reviewReturns`, never stored. |
| `lineage` | `{causedBy, escapedIn, qualityDimension, violatedRules}` | No | `null` | The quality lineage a corrective card's description states: `causedBy` is the key of the card whose delivery caused the defect, or `legacy` (then the rest is `null` and `[]`); `escapedIn` is `refine`, `action` or `review`; `qualityDimension` and the `violatedRules` (`<dimension>:<rule>` ids) say what failed. `null` while the description states no complete lineage. |
| `escapedDefects` | `{id, at, by, correctiveKey, escapedIn, qualityDimension, violatedRules}[]` | No | `[]` | The defects that escaped this card's delivery, oldest first: each corrective card that named it in its lineage, with the phase, the dimension and the rules. Append-only, one per corrective card. |
| `qualityRegressionTriggered` | `boolean` | No | `false` | True while `escapedDefects` is not empty: a defect escaped this card's delivery. |
| `reviewOutcomes` | `{id, at, by, role, from, to, verdict, ruleViolations, scorecard, observations, reviewReturnId}[]` | No | `[]` | Each exit from review, oldest first: `verdict` is `approved` (with the reviewer's `scorecard`, each dimension `clean` or `minor_observations`, and `observations`) or `sent_back` (with the `ruleViolations` the work broke, `<dimension>:<rule>`, and the `reviewReturnId` of its send-back). Written by `cards.move`; never edited. |
| `rejection` | `{reason, label, note, card}` | No | `null` | Why a rejected card was rejected: `reason` from the closed list (`not-needed`, `duplicate`, `superseded`, `wrong-split`, `infeasible`, `other`), its `label`, the `note` saying what was wrong, and the key of the `card` it names. Set by `cards.move` to `rejected`, cleared when the card is reopened. `null` on every other card. |
| `runState` | `string` | No | `idle` | The agent run: `idle`, `running`, `completed` or `failed`. |
| `version` | `integer` | No | `1` | Raised by every write; send it back as `expectedVersion`. |

Each card also carries `id`, `projectId`, `number`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `humanEditedAt`, `humanEditedBy` and `humanEditReviewedAt`.

### Fields only `cards.get` returns

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `attachments` | `array` | No | `[]` | Files attached to the card, 10 MB each at most. |
| `comments` | `array` | No | `[]` | Comments, with replies linked through `parentId`. Over MCP the last 3 by default; `omitted.comments` counts the rest. |
| `development` | `array` | No | `[]` | Commits, branches and pull requests from the project's GitHub repositories. |
| `checkpoints` | `array` | No | `null` | An epic's cards in build order, each with `state` (`pending`, `in_progress` or `completed`), `planned`, `blocked`, `ready`, `verification`, `sweepable` and its Action `mods`; `null` on a card that is not an epic. |
| `checkpointProgress` | `object` | No | `null` | `{completed, total}` over an epic's checkpoints, on every read of an epic, lists included, and shown as N/M on its board card; `null` on a card that is not an epic. |
| `epicChildren` | `integer` | No | `null` | How many cards name this epic; `null` on a card that is not an epic. |
| `timeEntries` | `array` | No | `[]` | The hours logged on the card, by people and agents. Over MCP left out by default (`omitted.timeEntries` counts them); `view: "full"` returns them. |

### Priority values

| Value | Shown as |
| --- | --- |
| `superHigh` | Critical |
| `high` | High |
| `medium` | Medium |
| `low` | Low |
| `superLow` | Very low |

### Status values

| Value | Shown as | Phase |
| --- | --- | --- |
| `refine` | Refine | `refine` |
| `todo` | To do | `action` |
| `doing` | In progress | `action` |
| `ready` | Ready | `ready` |
| `review` | Review | `review` |
| `deploy` | Deploy | `deploy` |
| `done` | Completed | — |
| `rejected` | Rejected | — |

### Category values

| Group | Values |
| --- | --- |
| Product and user value | `epic`, `feature`, `userStory`, `enhancement` |
| Corrective and stability | `bug`, `hotfix`, `regression` |
| Technical and platform | `refactor`, `technicalDebt`, `infrastructure`, `security` |
| Research and quality | `spike`, `testing`, `routine`, `documentation` |

### Signal values

| Value | Shown as |
| --- | --- |
| `touches-auth-permissions-or-personal-data` | Auth, permissions or personal data |
| `touches-ui` | User interface |
| `touches-hot-paths-or-heavy-queries` | Hot paths or heavy queries |
| `touches-data-schema` | Data schema |
| `touches-infrastructure` | Infrastructure |

## Next steps

- [How a card moves through the board](./card-lifecycle.md) — what each status means and which moves are refused.
- [How categories and their rules work](./categories.md) — what each category asks of a card.
- [Connect an agent to Officium](./connect-an-agent.md) — reach these fields from an agent through the MCP server.
