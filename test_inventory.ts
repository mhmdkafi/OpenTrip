import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("📱 Opening app...");
  await page.goto("http://localhost:3000/dashboard", { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  
  console.log("🔑 Clicking demo button...");
  const demoButton = page.locator("text=Buka demo");
  if (await demoButton.isVisible()) {
    await demoButton.click();
    await page.waitForLoadState("networkidle");
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("📱 Navigating to inventory...");
  // Click on inventory link in sidebar
  const inventoryLink = page.locator('a:has-text("Barang")');
  if (await inventoryLink.isVisible()) {
    await inventoryLink.click();
    await page.waitForLoadState("networkidle");
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log("📸 Taking inventory screenshot...");
  await page.screenshot({ path: "inventory.png", fullPage: true });
  console.log("✓ Screenshot saved: inventory.png");

  await browser.close();
  console.log("✓ Test complete!");
}

main().catch(console.error);
