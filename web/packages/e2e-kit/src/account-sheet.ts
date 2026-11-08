/*
 * The account sheet an app opens over itself from the Javadaba menu (JAVA-1026).
 *
 * One helper for every app suite, because the contract is the same everywhere: the entry opens a
 * dialog, the URL does not change, and Escape closes it and returns focus to the menu's trigger.
 * It asserts the SHEET, not what is inside it: an app's suite does not serve `/account`, so the
 * framed document is stubbed (the landing's own e2e covers the real page framed), and the session
 * is faked at its one probe, so no API has to be up.
 */
import { expect, type Page } from "@playwright/test";

import { mockAccountSession } from "./account-session";
import { seedConsentDenied } from "./consent";
import { waitForHydration } from "./hydration";

const MENU_TRIGGER = "summary:has-text('Javadaba menu')";

/** Answers the framed `/account` document with a page that says `ready`, as the real one does. */
async function stubAccountDocument(page: Page) {
  await page.route("**/account", (route) => {
    if (route.request().resourceType() !== "document") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body:
        "<!doctype html><title>account</title><p>account</p>" +
        // The sheet focuses its frame, so Escape reaches the page inside it, which asks to close.
        "<script>const say=(type)=>parent.postMessage({source:'javadaba-account',type},location.origin);" +
        "say('ready');addEventListener('keydown',(e)=>{if(e.key==='Escape')say('close')})</script>",
    });
  });
}

/**
 * Visits `path`, opens the Javadaba menu, takes its account entry and checks the sheet.
 * `signedIn` picks the session and so the entry and the sheet (the framed account, or the sign-in
 * form in place). `entry` is the entry's accessible name where an app words it differently
 * (Tributa's menu is Spanish). `gate` is for an app behind `SignedOutGate`, which opens its sign-in dialog
 * on arrival: the dialog is dismissed first, or it would cover the menu. `ready` runs after the page loads, for an app whose first-run
 * overlay would cover the menu (Sonus's onboarding).
 */
export async function expectAccountSheet(
  page: Page,
  {
    path,
    signedIn,
    entry,
    gate,
    ready,
  }: { path: string; signedIn: boolean; entry?: RegExp; gate?: boolean; ready?: () => Promise<void> },
) {
  await mockAccountSession(page, { signedIn });
  if (signedIn) await stubAccountDocument(page);
  await seedConsentDenied(page);
  await page.goto(path);
  // A click on the menu before React attaches its handlers is lost, and the sheet never opens.
  await waitForHydration(page);
  if (gate) {
    const gateDialog = page.getByRole("dialog");
    await expect(gateDialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(gateDialog).toBeHidden();
  }
  await ready?.();
  const url = page.url();

  // An app draws its menu twice (a bar for a phone and one for a desktop) and shows one: take the one on screen.
  const trigger = page.locator(MENU_TRIGGER).filter({ visible: true }).first();
  await trigger.click();
  const name = entry ?? (signedIn ? /^Hello/ : /Sign in or create account/);
  await page.getByRole("button", { name }).first().click();

  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  if (signedIn) {
    await expect(sheet.locator("iframe[title='Your account']")).toHaveAttribute("src", "/account");
    // Escape reaches the framed page only once it has loaded, which is when "Loading" is gone.
    await expect(sheet.getByRole("status")).toBeHidden();
  } else {
    await expect(sheet.getByLabel(/email/i).first()).toBeVisible();
  }
  expect(page.url()).toBe(url);

  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(page.url()).toBe(url);

  // The Close button, at whatever width the project runs, returns focus the same way.
  await trigger.click();
  await page.getByRole("button", { name }).first().click();
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Close" }).first().click();
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();
}
