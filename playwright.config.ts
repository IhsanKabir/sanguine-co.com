import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tier (EXECUTION-PLAN 5.8): fast, deterministic checks that run on
 * every CI push. Specs that need a seeded database tag themselves with
 * `@db` and self-skip when DATABASE_URL is absent (the GitHub runner has no
 * Supabase credentials), so the same suite runs everywhere — fuller locally,
 * leaner in CI. Nightly/full tiers can extend this config later.
 */
export default defineConfig({
  testDir: "./e2e",
  // Generous because the suite runs against `next dev`: a cold first hit
  // compiles the route on demand, which can take tens of seconds when
  // several pages compile concurrently.
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Few workers everywhere: parallel cold navigations contend on the dev
  // server's compiler and time each other out.
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: "http://localhost:3777",
    navigationTimeout: 60_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Dev server, not build+start: SSG prerendering at build time wants a
    // reachable database, which CI does not have. Dev compiles per-request
    // and every page degrades gracefully without the DB.
    command: "npm run dev -- -p 3777",
    url: "http://localhost:3777/en",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
