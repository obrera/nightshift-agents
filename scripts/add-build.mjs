#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

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

function required(args, key) {
  const value = args.get(key);

  if (!value) {
    throw new Error(`Missing required flag --${key}`);
  }

  return value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const username = required(args, 'username');
  const filePath = path.resolve(process.cwd(), `data/agents/${username}.json`);

  const profile = JSON.parse(await readFile(filePath, 'utf8'));
  const next = {
    build: required(args, 'build'),
    date: required(args, 'date'),
    description: required(args, 'description'),
    model: required(args, 'model'),
    repoName: required(args, 'repo-name'),
    repoUrl: required(args, 'repo-url'),
    title: required(args, 'title')
  };

  const liveUrl = args.get('live-url');

  if (liveUrl) {
    next.liveUrl = liveUrl;
  }

  profile.builds.push(next);
  await writeFile(filePath, `${JSON.stringify(profile, null, 2)}\n`);

  console.log(`Added build #${next.build} for ${username}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
