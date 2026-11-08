---
title: "Set up sign-in with Google"
description: "Connect your app to Google OAuth 2.0 so users sign in with their Google account in under ten minutes, from keys to the first login."
type: how-to
status: beta
audience:
  - developer
  - admin
last_updated: 2026-10-02
level: intermediate
tags:
  - auth
related:
  - ./manage-sessions.md
  - ./auth-api-reference.md
---

# Set up sign-in with Google

> [!NOTE]
> Sign-in uses the account you already have.

> [!TIP]
> Keep the console open in a second tab.

> [!IMPORTANT]
> The redirect URI must match **exactly**.
>
> Trailing slashes count.

> [!WARNING]
> Changing the port disconnects the active clients.

> [!CAUTION]
> Deleting the key signs everyone out.

## Overview

```mermaid
flowchart TD
  accTitle: Sign-in flow
  accDescr: The browser goes to Google, Google returns a code, the API exchanges it for a session.
  browser["Browser"] --> google["Google"]
  google --> api["API"]
```

## Steps

Press <kbd>Ctrl</kbd>+<kbd>S</kbd> to save, then reload.

```mermaid
flowchart TD
  this is not --> a valid [diagram
```

## FAQ

### Can I use another provider?

No.

<details>
<summary>Why only <kbd>Google</kbd>?</summary>

Because the **account** is shared across apps.

- One login
- One session

</details>

<details open>
<summary>Already open</summary>

Shown expanded.

</details>
