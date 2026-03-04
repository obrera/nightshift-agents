#!/usr/bin/env node
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const AGENTS_DIR = path.resolve(process.cwd(), 'data/agents');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const MOBILE_VIEWPORT = { width: 390, height: 844 };

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

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listAgentFiles(username) {
  if (username) {
    return [path.join(AGENTS_DIR, `${username}.json`)];
  }

  const entries = await readdir(AGENTS_DIR, {
    withFileTypes: true
  });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(AGENTS_DIR, entry.name))
    .sort();
}

function getScreenshotPath(username, build) {
  const slugSource = build.title || build.repoName || 'build';
  const slug = slugify(slugSource) || 'build';
  const fileName = `${build.build}-${slug}.png`;

  return {
    relative: `/screenshots/${username}/${fileName}`,
    absolute: path.join(PUBLIC_DIR, 'screenshots', username, fileName)
  };
}

async function screenshotBuild(context, username, build, force) {
  if (!build.liveUrl) {
    return { status: 'ignored' };
  }

  const target = getScreenshotPath(username, build);
  const exists = await fileExists(target.absolute);

  if (exists && !force) {
    build.screenshot = target.relative;
    return { status: 'skipped', path: target.relative };
  }

  const page = await context.newPage();

  try {
    await mkdir(path.dirname(target.absolute), { recursive: true });
    await page.goto(build.liveUrl, { timeout: 30_000, waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const responsive = await page.evaluate(() => {
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
        isResponsive: scrollWidth <= viewportWidth + 1,
        scrollWidth,
        viewportWidth
      };
    });

    if (!responsive.isResponsive) {
      return {
        status: 'failed',
        error: `page appears non-responsive (scrollWidth=${responsive.scrollWidth}, viewportWidth=${responsive.viewportWidth})`
      };
    }

    await page.screenshot({ path: target.absolute, fullPage: false });
    build.screenshot = target.relative;

    return { status: 'captured', path: target.relative };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    await page.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const usernameFilter = args.get('username') || null;
  const buildFilter = args.get('build') || null;
  const force = args.get('force') === 'true';

  const files = await listAgentFiles(usernameFilter);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    hasTouch: true,
    ignoreHTTPSErrors: true,
    isMobile: true,
    viewport: MOBILE_VIEWPORT
  });

  let targetCount = 0;
  let successCount = 0;

  try {
    for (const filePath of files) {
      const profile = JSON.parse(await readFile(filePath, 'utf8'));
      const username = profile.username;
      let changed = false;

      for (const build of profile.builds) {
        if (!build.liveUrl) {
          continue;
        }

        if (buildFilter && build.build !== buildFilter) {
          continue;
        }

        targetCount += 1;

        const result = await screenshotBuild(context, username, build, force);

        if (result.status === 'captured') {
          changed = true;
          successCount += 1;
          console.log(`captured ${username}#${build.build} -> ${result.path}`);
          continue;
        }

        if (result.status === 'skipped') {
          if (!build.screenshot) {
            changed = true;
          }
          successCount += 1;
          console.log(`skipped  ${username}#${build.build} (exists)`);
          continue;
        }

        console.error(`failed   ${username}#${build.build} -> ${result.error}`);
      }

      if (changed) {
        await writeFile(filePath, `${JSON.stringify(profile, null, 2)}\n`);
      }
    }
  } finally {
    await browser.close();
  }

  if (targetCount === 0) {
    console.log('No matching builds with liveUrl found.');
    return;
  }

  if (successCount === 0) {
    process.exit(1);
  }

  console.log(`done: ${successCount}/${targetCount} succeeded`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
