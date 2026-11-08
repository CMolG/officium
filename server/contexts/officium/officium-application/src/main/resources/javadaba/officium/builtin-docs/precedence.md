---
title: "How precedence rules work"
description: "Let a project say which cards come first: a rule matches cards by epic, tags, category or signals, and cards.next and new cards follow it."
type: explanation
status: stable
audience:
  - end-user
last_updated: 2026-10-21
tags:
  - precedence
  - priority
  - sprints
related:
  - ./sprints-and-epics.md
  - ./card-fields.md
  - ./ai-and-human-cards.md
---

# How precedence rules work

Every project decides its own order of work. Precedence rules let a project say that some cards come before the rest, for example the cards of one epic, a release train, or a compliance tag. This page explains what a rule is, what it changes, and what it does not.

## Key concepts

**Rule**: a named list of conditions that picks cards, with two optional defaults. A rule has a `name` (unique in the project, up to 80 characters), a `reason` (why the rule exists, up to 500 characters) and a `match`.

**Match**: the cards a rule picks. It has four facets: `epics`, `tags`, `categories` and `signals`. A card matches a facet when it has any one of that facet's values. A rule matches a card when the card matches every facet the rule names, and a rule names at least one.

**Rank**: the position of a card's first matching rule. Rule 1 ranks before rule 2, and so on. A card that matches no rule has no rank and keeps today's order.

**Default**: what a rule does to a card when the card enters it. A `priority` is a floor: the card is raised to it when lower and never lowered. `sprint` is `none` (the default) or `join`, which plants an unplanned card in the active sprint.

## Overview

The order of `cards.next` is fixed in this sequence:

1. Hotfix cards, then security cards, as always.
2. Cards that match a precedence rule, by the rule's position in the list.
3. Everything else, by priority, then phase, then card order.

A card in two rules is ranked by the higher one. Within a rank, the usual order decides. A project with no rules gets exactly the order it always had.

Precedence changes one thing only: which card an agent is handed first. It does not change which cards exist, who may edit them, or what a person sees in a column.

### Match an epic

An epic facet takes epic keys, like `OFF-12`. A card matches it when its `epic` field holds that key, or the epic's label when exactly one epic carries that label. An epic card never matches: epics are never worked themselves.

### Match tags, categories and signals

Tags match without regard to case, and surrounding spaces are ignored. Categories and signals match by their stored values. A category or signal that is removed from the project later is ignored when matching and is listed as unknown, so the rest of the list can still be saved.

### Defaults on new and moved cards

When a card is created into a rule, or an edit moves it into one, the rule's defaults apply:

- The priority is raised to the rule's floor when it is lower. An explicit `priority` in the same request always wins, in either direction.
- With `sprint: join`, the card joins the active sprint. This is skipped for an epic and when no sprint is active. An explicit `sprintId` in the request wins.

A status move applies nothing. Saving a rule never edits existing cards: it only changes how cards are ranked and what the next card creation or edit does. Every change a rule makes is written in the card's history with the rule's name, for example `Priority raised to High by the rule "Release 4"`.

### Limits and dormant rules

A project holds at most 20 rules, and each facet at most 20 values. A rule that names an epic which is done or rejected stays in the list and is shown as dormant. A rule that names an epic that does not exist, has no facet values, or repeats another rule's name is refused when saved, and the refusal names the rule and the field.

### Who changes the list

Only a project owner can replace the whole list. Any member can read it, together with how many open cards each rule matches and a preview of an unsaved rule. The list carries a version: a save made against an older version is refused, and the answer contains the current list and who saved it last.

### Bring a rule's open cards into the sprint

Saving a rule never moves a card that already matches it. A rule with `sprint: join` leaves those cards where they are, outside the active sprint. To bring them in, preview first, then apply. Only a project owner can apply; any member can preview.

- The preview lists the open cards the rule ranks that are not in the active sprint: cards in the backlog, in a planned sprint or in a closed one. Epics, done and rejected cards, cards in deploy, and cards an earlier rule ranks are left out, and so are cards already in the sprint. Nothing is saved by the preview.
- The apply moves exactly those cards into the active sprint, in one step, in card-number order, and writes one history line per card. A second apply moves nothing.
- The apply sends back the list's version. If the rule changed since the preview, the apply is refused and the answer names the current list.

A rule that does not join, a project with no active sprint, and an unknown rule are each refused with their own reason.

### Start from a template

The Fluxor market offers ready-made lists, such as a release train or compliance first. Any member can read them with `projects.precedenceTemplates`; each names the placeholders it needs, for example an epic's key. A project owner imports one with `projects.importPrecedenceTemplate`, sending `values` for those placeholders.

- The import adds the template's rules after the project's own. It never replaces or reorders them.
- It is the same write as saving the list: the owner check, the list's version, the 20-rule limit, unique names and known epics all apply, and the refusal names the rule and the field.
- A template that does not exist is refused with `precedence_template_not_found`, and a placeholder left blank with `precedence_placeholder_missing`.

## Next steps

- [How sprints and epics work](./sprints-and-epics.md) — what the `sprint: join` default plants a card into.
- [Card fields](./card-fields.md) — the fields a rule matches: epic, tags, category and signals.
- [AI and human cards](./ai-and-human-cards.md) — which cards `cards.next` hands to an agent.
