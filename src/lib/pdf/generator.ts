import { chromium } from "playwright";

export async function generatePdf(html: string): Promise<Buffer> {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle", timeout: 30_000 });
    return Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }));
  } catch {
    return Buffer.from(html, "utf8");
  } finally {
    await browser?.close();
  }
}
