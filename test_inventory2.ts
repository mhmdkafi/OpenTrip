import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("📱 Opening app...");
  await page.goto("http://localhost:3000/dashboard", { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  
  console.log("🔑 Clicking demo button...");
  const demoButton = page.locator("button:has-text('Buka demo')");
  if (await demoButton.isVisible()) {
    await demoButton.click();
    await page.waitForLoadState("networkidle");
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("📱 Navigating to inventory via URL...");
  await page.goto("http://localhost:3000/dashboard/inventory", { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("📸 Taking inventory screenshot...");
  await page.screenshot({ path: "inventory_new.png", fullPage: true });
  console.log("✓ Screenshot saved: inventory_new.png");

  await browser.close();
  console.log("✓ Test complete!");
}

main().catch(console.error);
