
import puppeteer from "puppeteer";
import fetch from 'node-fetch';
import { APP_CONSTANTS } from '../utils';

const { API_TIMEOUT } = APP_CONSTANTS;

export async function simulateStoreVisit(storeUrl) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  // Ensure store URL is a full valid URL
  const visitURL = storeUrl.startsWith("http")
    ? storeUrl
    : `https://${storeUrl}`;

  try {
    await page.goto(visitURL, { waitUntil: "load", timeout: API_TIMEOUT });
    console.log(`✅ Visited ${visitURL} to trigger vitals script`);

    // Wait to let vitals script execute (e.g., web-vitals)
    await new Promise(resolve => setTimeout(resolve, 5000));
  } catch (err) {
    console.error("❌ Failed to visit storefront:", err);
  } finally {
    await browser.close();
  }
}
