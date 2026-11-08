import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The static renderer and the editor both need a DOM; jsdom is enough for what is asserted here.
    // Typing into the editor is proven in a real browser, by the consumers' Playwright suites.
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
