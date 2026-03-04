#!/usr/bin/env node
import process from 'node:process';
import { chromium } from 'playwright';

function parseArgs(argv) {
  const map = new Map();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (!arg.startsWith('--')) {
      continue;
    }

    const key = arg.slice(2);
    const value = argv[i + 1];

    if (!value || value.startsWith('--')) {
      map.set(key, 'true');
      continue;
    }

    map.set(key, value);
    i += 1;
  }

  return map;
}

async function checkViewport(browser, url, viewport, isMobile) {
  const context = await browser.newContext({
    deviceScaleFactor: isMobile ? 2 : 1,
    hasTouch: isMobile,
    isMobile,
    viewport
  });

  const page = await context.newPage();

  try {
    await page.goto(url, { timeout: 30_000, waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    const result = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const viewportWidth = window.innerWidth;
      const scrollWidth = Math.max(
        doc?.scrollWidth ?? 0,
        body?.scrollWidth ?? 0,
        doc?.offsetWidth ?? 0,
        body?.offsetWidth ?? 0
      );

      return {
        scrollWidth,
        viewportWidth
      };
    });

    return {
      ok: result.scrollWidth <= result.viewportWidth + 1,
      scrollWidth: result.scrollWidth,
      viewportWidth: result.viewportWidth
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = args.get('url');

  if (!url) {
    console.error('Missing required flag --url');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const checks = [
      { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true },
      { name: 'desktop', viewport: { width: 1280, height: 720 }, isMobile: false }
    ];

    let failed = false;

    for (const check of checks) {
      const result = await checkViewport(browser, url, check.viewport, check.isMobile);

      if (result.ok) {
        console.log(
          `PASS ${check.name}: viewport=${result.viewportWidth}, scrollWidth=${result.scrollWidth}`
        );
      } else {
        failed = true;
        console.error(
          `FAIL ${check.name}: viewport=${result.viewportWidth}, scrollWidth=${result.scrollWidth}`
        );
      }
    }

    if (failed) {
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
