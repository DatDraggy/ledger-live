import test from "../../fixtures/common";
import { expect } from "@playwright/test";
import { Layout } from "../../component/layout.component";
import { LiveAppWebview } from "../../models/LiveAppWebview";

test.use({
  userdata: "1AccountBTC1AccountETH",
});

let testServerIsRunning = false;

test.beforeAll(async () => {
  // Check that dummy app in tests/dummy-ptx-app has been started successfully
  testServerIsRunning = await LiveAppWebview.startLiveApp("dummy-ptx-app/public", {
    name: "Earn",
    id: "earn",
    apiVersion: "^2.0.0",
    permissions: ["account.list"],
  });

  if (!testServerIsRunning) {
    console.warn("Stopping Earn test setup");
    return;
  }
});

test.afterAll(async () => {
  if (testServerIsRunning) {
    await LiveAppWebview.stopLiveApp();
  }
});

test("Earn @smoke", async ({ page }) => {
  if (!testServerIsRunning) {
    console.warn("Test server not running - Cancelling Earn E2E test");
    return;
  }

  const layout = new Layout(page);
  const liveAppWebview = new LiveAppWebview(page);

  await test.step("Navigate to Earn app from main side drawer navigation", async () => {
    await layout.goToEarn();
    await liveAppWebview.waitForLoaded();

    expect(await liveAppWebview.waitForCorrectTextInWebview("theme: dark")).toBeVisible();
    expect(await liveAppWebview.waitForCorrectTextInWebview("lang: en")).toBeVisible();
    expect(await liveAppWebview.waitForCorrectTextInWebview("locale: en-US")).toBeVisible();
    expect(await liveAppWebview.waitForCorrectTextInWebview("discreetMode: false")).toBeVisible();
    expect(await liveAppWebview.waitForCorrectTextInWebview("currencyTicker: USD")).toBeVisible();
    await expect
      .soft(page)
      .toHaveScreenshot("earn-app-opened.png", { mask: [page.locator("webview")] });
  });
});
