import { test, expect } from "@playwright/test";

/**
 * EXECUTION-PLAN phase-1 spec ("audio-silent-without-consent"): a fresh
 * visitor who has NOT accepted cookies must trigger no audio whatsoever,
 * even after interacting — PDPO 2025 posture. Covers both the WebAudio
 * synth path (AudioContext) and the new file path (HTMLAudioElement.play).
 */
test("no audio without cookie consent, even after a click", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, number>;
    w.__audioCtxCreated = 0;
    w.__audioPlayCalls = 0;
    const OrigCtx = window.AudioContext;
    window.AudioContext = class extends OrigCtx {
      constructor(...args: ConstructorParameters<typeof AudioContext>) {
        super(...args);
        (window as unknown as Record<string, number>).__audioCtxCreated++;
      }
    };
    const origPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      (window as unknown as Record<string, number>).__audioPlayCalls++;
      return origPlay.apply(this, args);
    };
  });

  await page.goto("/en");
  // First pointer gesture is exactly what arms the gong in atier.js.
  await page.mouse.click(400, 300);
  await page.waitForTimeout(500);

  const created = await page.evaluate(
    () => (window as unknown as Record<string, number>).__audioCtxCreated,
  );
  const played = await page.evaluate(
    () => (window as unknown as Record<string, number>).__audioPlayCalls,
  );
  expect(created).toBe(0);
  expect(played).toBe(0);
});
