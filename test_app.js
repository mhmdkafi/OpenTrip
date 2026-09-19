import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("📱 Opening overview page...");
  await page.goto("http://localhost:3000/dashboard", { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  
  // Take a screenshot of overview
  await page.screenshot({ path: "overview.png" });
  console.log("✓ Screenshot saved: overview.png");

  console.log("📱 Opening inventory page...");
  await page.goto("http://localhost:3000/dashboard/inventory", { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  
  // Take a screenshot of inventory
  await page.screenshot({ path: "inventory.png" });
  console.log("✓ Screenshot saved: inventory.png");

  await browser.close();
  console.log("✓ Test complete!");
}

main().catch(console.error);
