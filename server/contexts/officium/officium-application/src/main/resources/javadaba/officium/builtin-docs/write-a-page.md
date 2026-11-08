---
title: "Write a documentation page in Officium"
description: "Create a page in your project's Documentation, write it in the editor, link it to other pages, and tell the changelog which change it answers."
type: how-to
status: stable
audience:
  - end-user
last_updated: 2026-10-15
tags:
  - documentation
  - editor
related:
  - ./documentation.md
  - ./connect-an-agent.md
---

# Write a documentation page in Officium

Write a page about how your project works, such as a procedure, a decision or a runbook. At the end, the page sits in your project's tree, links to its neighbors, and answers the change that made it necessary.

## Prerequisites

- Editor or owner access to the project.

## Steps

### 1. Create the page

Every page has a title and a path; the path places it in the tree.

1. Open **Documentation** in the project's sidebar and select **New page**.
2. In the **Title** field, type the page's name, like `Deploy to production`.
3. Check the **Path**: it follows the title until you change it. Use `/` to put the page under a section, like `procedures/deploy`.
4. Select **Create page**.

The page opens empty, with the cursor in its text. A new page is an **unpublished draft**: only you can see it, and a banner above the page says so.

### 2. Write the text

You edit a page where you read it, and Officium saves as you type. There is no Edit button and no Save button. The bar above the text says **Saving…**, then **Saved**.

1. Type the title in place of the page's heading, and the text under it.
2. To add a block, type `/` on an empty line, or select **+** beside it. Pick a heading, a list, a task list, a table, code, a notice, a disclosure, a Mermaid diagram or a quote.
3. To format words, select them: bold, italic, strikethrough, inline code, a key, a link, or **Turn into** for the block.

Markdown works too: `## ` starts a heading, and pasted Markdown is converted. To edit the Markdown itself, select **Markdown source**. Press <kbd>Ctrl</kbd>+<kbd>S</kbd> to save at once.

If the page has a metadata block at the top, its frontmatter, the visual editor keeps it as written. Change it in the Markdown source. A page the visual editor can't keep exactly shows as you read it, with **Edit the Markdown source**.

When the page is ready, select **Publish** in the banner. From then on everyone in the project, and their agents, can see it. Your unpublished drafts are listed under **Unpublished drafts** in the page tree.

### 3. Link the pages it relates to

Type `[[` and part of a page's title, then pick the page: the link carries its path. A title no page has yet offers **Create page**, which creates an empty page under this one and links it. Type `@` and a name to mention a member of the project.

You can also write a link by hand, relative to this page's folder. From `procedures/deploy`, this line links `procedures/rollback`:

```text
- [Roll back a deploy](./rollback.md) — what to do when the deploy fails.
```

In Officium the link opens the page itself; an outside link opens in a new tab. While you edit, put the cursor in a link to open, change or remove it, or <kbd>Ctrl</kbd>+click it to open it. Pages listed under `related` in the frontmatter also show as **Related** links at the top.

### 4. Answer the changelog

If a change to the code made this page necessary, say so on its changelog entry:

1. Open **Changelog** at the top of the page tree.
2. On the change's entry, select **Pages updated…**.
3. Check your page and select **Mark as updated**.

The entry now shows **Docs updated**, with a link to your page.

## Check the result

Open the page from the tree and read it as others will. To check it as an agent sees it, ask your agent to run:

```json
{ "operation": "docs.get", "params": { "projectId": "<PROJECT_ID>", "path": "procedures/deploy" } }
```

Replace `<PROJECT_ID>` with your project's id. The answer carries the page with its text, at the version your last save made:

```text
"path": "procedures/deploy",
"title": "Deploy to production",
```

## Troubleshooting

### `Another page already lives at this path.`

**Cause:** a page of the project already uses that path.

**Solution:** choose another path, or open the existing page and edit it.

### `Pages under officium/ are Officium's own documentation: choose another path.`

**Cause:** the `officium/` section holds Officium's own pages, the same in every project.

**Solution:** put your page under another section, like `guides/`.

### `"documentation/changelog" is where the changelog lives: give the page another path`

**Cause:** the changelog, the test history, and the sections for unpublished drafts, the archive and the trash have reserved paths.

**Solution:** choose another path for your page.

### Someone else saved this page first

**Cause:** another person or an agent saved the page while you were editing it. Nothing was overwritten.

**Solution:** select **Use theirs**, **Keep mine** or **Merge them**. Merging puts their version in the editor with yours beside it.

### Couldn't save

**Cause:** the save did not reach Officium, or Officium refused it. The bar above the text says why.

**Solution:** select **Try again**. Your text stays in the editor meanwhile. If you leave the page first, it is kept and comes back when you open the page again. When the cause is a full allowance, follow **See what takes the space**.

## FAQ

### Can a page show images?

Yes. Paste or drop an image into the page, or type `/image`. It is uploaded to the page, reduced with no visible loss, and shown with its caption. A diagram is still better as text, in a `mermaid` code block. A page never loads an image from another site.

### Can I rename or move a page?

Yes. Type over its title to rename it: the title saves like the text. Select **Move to…** in the page's options to pick a new place, and so a new path, for it. You can also drag a page in the tree: onto the middle of another row to put it inside, or onto its top or bottom edge to place it beside. A move takes everything under the page along, and **Undo** puts it back. The old address keeps leading to the page, but links in other pages aren't rewritten: the page's **Referenced by** list shows who still points at the old one.

### Can I get a deleted page back?

Yes, for 30 days. **Delete** asks nothing: the page goes to the **Trash**, and a notice offers **Undo**. Later, open **Trash** in the page tree and select **Restore**. Its path is free in between, so restoring fails if another page took it. **Delete forever** removes a trashed page at once, and asks you to type its title.

### Can I hide a page without deleting it?

Yes. Select **Archive** on a published page. It leaves the tree and the search, stays readable by its address, and cannot be edited until you select **Unarchive**. Archived pages are listed under **Archive**.

## Next steps

- [How documentation, the changelog and test history work](./documentation.md) — how pages, the changelog and test history fit together.
- [Connect an agent to Officium](./connect-an-agent.md) — let an agent read and update your pages too.
