// Scraper skeleton for the Salone del Mobile exhibitor catalog.
//
// IMPORTANT: respect the site's terms of service and robots.txt. Run sparingly.
// The official site is JS-rendered, so we use Playwright to wait for hydration.
//
// Selectors below are placeholders — verify with the live site's DOM before
// running at scale. Recommended fallback: use the official CSV/Excel buyer
// list (see import-csv.ts).

import { chromium, type Page } from 'playwright';
import { upsertCompanies, type CompanyRow } from './supabase.js';
import 'dotenv/config';

const BASE_URL = process.env.SCRAPE_BASE_URL ?? 'https://www.salonemilano.it/en/exhibitors';
const MAX_PAGES = parseInt(process.env.SCRAPE_MAX_PAGES ?? '50', 10);

async function scrapeListing(page: Page): Promise<string[]> {
  // Returns an array of detail-page URLs collected from the listing.
  const links = await page.$$eval('a[href*="/exhibitor/"]', (els) =>
    Array.from(new Set(els.map((e) => (e as HTMLAnchorElement).href)))
  );
  return links;
}

async function scrapeDetail(page: Page, url: string): Promise<CompanyRow | null> {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  const data = await page.evaluate(() => {
    const text = (sel: string) => document.querySelector(sel)?.textContent?.trim() ?? '';
    return {
      name: text('h1'),
      description: text('[class*="description"], [class*="bio"]'),
      website: (document.querySelector('a[href^="http"]') as HTMLAnchorElement)?.href,
      stand: text('[class*="stand"]'),
      hall: text('[class*="hall"]'),
      pavilion: text('[class*="pavilion"]'),
    };
  });

  if (!data.name) return null;

  return {
    external_id: url.split('/').filter(Boolean).pop(),
    name: data.name,
    description: data.description || undefined,
    website: data.website || undefined,
    stand_number: data.stand || undefined,
    hall: data.hall || undefined,
    pavilion: data.pavilion || undefined,
    source: 'scraped',
  };
}

async function main() {
  console.log(`Launching browser → ${BASE_URL}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (compatible; SaloneCompanionImporter/0.1; +https://github.com/yourrepo)',
  });
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  const seen = new Set<string>();
  const all: CompanyRow[] = [];

  for (let i = 0; i < MAX_PAGES; i++) {
    const links = await scrapeListing(page);
    const fresh = links.filter((l) => !seen.has(l));
    fresh.forEach((l) => seen.add(l));
    console.log(`Page ${i + 1}: +${fresh.length} new (total ${seen.size})`);

    for (const link of fresh) {
      try {
        const row = await scrapeDetail(page, link);
        if (row) all.push(row);
      } catch (err) {
        console.warn('  failed', link, (err as Error).message);
      }
    }

    // Try to advance pagination — selector to be confirmed.
    const nextBtn = await page.$('a[rel="next"], button[aria-label="Next"]');
    if (!nextBtn) break;
    await nextBtn.click();
    await page.waitForLoadState('networkidle');
  }

  console.log(`Scraped ${all.length} companies — writing to Supabase`);
  await upsertCompanies(all);
  await browser.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
