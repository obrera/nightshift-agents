#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const agentsDir = path.resolve(process.cwd(), 'data/agents');
  const files = (await readdir(agentsDir))
    .filter((name) => name.endsWith('.json'))
    .sort();

  const errors = [];

  for (const file of files) {
    const filePath = path.join(agentsDir, file);
    const raw = await readFile(filePath, 'utf8');
    const profile = JSON.parse(raw);
    const username = profile.username ?? file.replace(/\.json$/, '');
    const builds = Array.isArray(profile.builds) ? profile.builds : [];

    for (const build of builds) {
      const model = typeof build.model === 'string' ? build.model.trim() : '';

      if (!model) {
        errors.push(`${file}: build ${build.build ?? 'unknown'} is missing model`);
        continue;
      }

      if (!model.includes('/')) {
        errors.push(`${file}: build ${build.build ?? 'unknown'} has invalid model format: ${model}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('Model metadata validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Model metadata validation passed for ${files.length} profile file(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
