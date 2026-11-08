/**
 * The mock build's test hooks on Android: none. They exist for Playwright, which drives the web
 * build through `window.__OFFICIUM_MOCK__`; there is no page to hang them on here.
 */
export function installMockTestHooks(): void {}
