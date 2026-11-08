import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Radix renders into a DOM; jsdom is enough for the menu's keyboard and pointer contract.
    // What it looks like, and a real right-click, are proven by the consumers' Playwright suites.
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
